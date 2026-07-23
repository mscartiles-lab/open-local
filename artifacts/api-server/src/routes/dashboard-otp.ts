import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { sendVerificationEmail } from "../lib/email";
import { db, usersTable, vendorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// In-memory OTP store: userId → { code, expiresAt }
// Ephemeral — resets on server restart (intentional for this low-security guard)
interface OtpEntry {
  code: string;
  email: string;
  expiresAt: number;
  devFallback: boolean;
}

const otpStore = new Map<number, OtpEntry>();

function generateCode(): string {
  return String(Math.floor(100000 + crypto.randomInt(900000)));
}

/**
 * POST /api/dashboard/otp/send
 * Sends a 6-digit code to the vendor's contact email for dashboard 2FA.
 * Requires the caller to be authenticated (Bearer token).
 */
router.post("/dashboard/otp/send", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (user.role !== "vendor") {
      res.status(403).json({ error: "Dashboard OTP is for vendor accounts only" });
      return;
    }

    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

    const result = await sendVerificationEmail({
      to: user.email,
      code,
      businessName: user.username ?? "there",
    });

    otpStore.set(userId, {
      code,
      email: user.email,
      expiresAt,
      devFallback: result.devFallback,
    });

    logger.info({ userId, email: user.email }, "[dashboard-otp] code sent");

    res.json({
      sent: result.sent,
      devFallback: result.devFallback,
      devCode: result.devFallback ? code : null,
      email: user.email,
    });
  } catch (err) {
    logger.error({ err }, "[dashboard-otp] send error");
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

/**
 * POST /api/dashboard/otp/verify
 * Verifies a dashboard OTP. Returns { valid: true } on success.
 */
router.post("/dashboard/otp/verify", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { code } = req.body as { code?: string };

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required" });
    return;
  }

  const entry = otpStore.get(userId);
  if (!entry) {
    res.status(400).json({ error: "No OTP found — request a new code first" });
    return;
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(userId);
    res.status(400).json({ error: "Code expired — request a new one" });
    return;
  }
  if (code.trim() !== entry.code) {
    res.status(400).json({ error: "Incorrect code" });
    return;
  }

  otpStore.delete(userId);
  logger.info({ userId }, "[dashboard-otp] verified");
  res.json({ valid: true });
});

export default router;
