import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { sendVerificationEmail } from "../lib/email";
import { db, usersTable, vendorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { claimVendorForUser } from "../lib/vendorOwnership";

const router: IRouter = Router();

// In-memory OTP store: userId → { code, expiresAt }
// Ephemeral — resets on server restart (intentional for this low-security guard)
interface OtpEntry {
  code: string;
  email: string;
  vendorId: number;
  vendorSlug: string;
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
    const vendorSlug =
      typeof req.body?.vendorSlug === "string" ? req.body.vendorSlug.trim() : "";
    if (!vendorSlug) {
      res.status(400).json({ error: "vendorSlug is required" });
      return;
    }
    const [user] = await db
      .select({ id: usersTable.id, role: usersTable.role, username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (user.role !== "vendor") {
      res.status(403).json({ error: "Dashboard OTP is for vendor accounts only" });
      return;
    }

    const [vendor] = await db
      .select({
        id: vendorsTable.id,
        slug: vendorsTable.slug,
        name: vendorsTable.name,
        contactEmail: vendorsTable.contactEmail,
        ownerUserId: vendorsTable.ownerUserId,
      })
      .from(vendorsTable)
      .where(eq(vendorsTable.slug, vendorSlug))
      .limit(1);
    if (!vendor) {
      res.status(404).json({ error: "Vendor profile not found" });
      return;
    }
    if (vendor.ownerUserId !== null && vendor.ownerUserId !== userId) {
      res.status(403).json({ error: "This vendor profile is managed by another account." });
      return;
    }

    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

    const result = await sendVerificationEmail({
      to: vendor.contactEmail,
      code,
      businessName: vendor.name,
    });

    otpStore.set(userId, {
      code,
      email: vendor.contactEmail,
      vendorId: vendor.id,
      vendorSlug: vendor.slug,
      expiresAt,
      devFallback: result.devFallback,
    });

    logger.info({ userId, vendorId: vendor.id }, "[dashboard-otp] code sent");

    res.json({
      sent: result.sent,
      devFallback: result.devFallback,
      devCode: result.devFallback ? code : null,
      email: vendor.contactEmail,
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
  const { code, vendorSlug } = req.body as { code?: string; vendorSlug?: string };

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
  if (!vendorSlug || entry.vendorSlug !== vendorSlug) {
    res.status(400).json({ error: "This code was requested for a different vendor profile." });
    return;
  }
  if (!(await claimVendorForUser(userId, entry.vendorId))) {
    otpStore.delete(userId);
    res.status(409).json({ error: "This vendor profile is already managed by another account." });
    return;
  }

  otpStore.delete(userId);
  logger.info({ userId, vendorId: entry.vendorId }, "[dashboard-otp] verified and linked");
  res.json({ valid: true, vendorSlug: entry.vendorSlug });
});

export default router;
