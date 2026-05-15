import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import { db, usersTable, sessionsTable, signupVerificationsTable } from "@workspace/db";
import { generateVerificationCode, sendVerificationEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { emitEvent } from "../lib/webhooks";
import { isReplitWorkspaceRequest } from "../lib/requireAdmin";

const router: IRouter = Router();

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const AVATAR_STYLES = [
  "thumbs",
  "adventurer",
  "fun-emoji",
  "pixel-art",
  "avataaars",
  "big-smile",
  "bottts",
  "lorelei",
  "micah",
  "miniavs",
  "notionists",
  "open-peeps",
  "personas",
  "croodles",
] as const;

const SignupStartBody = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  role: z.enum(["vendor", "shopper"]),
  zip: z.string().min(1).optional(),
  state: z.string().default("FL"),
  avatarSeed: z.string().min(1),
  avatarStyle: z.enum(AVATAR_STYLES),
});

const SignupVerifyBody = z.object({
  verificationId: z.number().int().positive(),
  code: z.string().regex(/^\d{6}$/),
});

const SignupResendBody = z.object({
  verificationId: z.number().int().positive(),
});

function generateToken(): string {
  return crypto.randomUUID() + "-" + crypto.randomUUID();
}

function userPublic(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarSeed: user.avatarSeed,
    avatarStyle: user.avatarStyle,
    role: user.role,
    zip: user.zip,
    state: user.state,
    paused: user.paused,
    trialEndsAt: user.trialEndsAt ? user.trialEndsAt.toISOString() : null,
    createdAt: user.createdAt,
  };
}

router.get("/auth/check-username", async (req: Request, res: Response): Promise<void> => {
  const username = String(req.query.username ?? "");
  if (!username || username.length < 3) {
    res.status(400).json({ error: "Username too short" });
    return;
  }
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase()));
  res.json({ available: !existing });
});

router.post("/auth/signup/start", async (req: Request, res: Response): Promise<void> => {
  const parsed = SignupStartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { email, username, role, zip, state, avatarSeed, avatarStyle } = parsed.data;

  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();

  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));
  if (existingUser) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const [existingUsername] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, normalizedUsername));
  if (existingUsername) {
    res.status(409).json({ error: "That username is already taken." });
    return;
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

  const payload = { email: normalizedEmail, username: normalizedUsername, role, zip, state, avatarSeed, avatarStyle };

  const [row] = await db
    .insert(signupVerificationsTable)
    .values({ email: normalizedEmail, code, payload, expiresAt })
    .returning({ id: signupVerificationsTable.id });

  let devFallback = false;
  try {
    const result = await sendVerificationEmail({
      to: normalizedEmail,
      code,
      businessName: username,
    });
    devFallback = result.devFallback;
  } catch (err) {
    logger.error({ err }, "[signup] failed to send verification email");
    res.status(502).json({ error: "Couldn't send the verification email. Please try again." });
    return;
  }

  const adminViewer = devFallback && isReplitWorkspaceRequest(req);
  res.status(201).json({
    verificationId: row!.id,
    email: normalizedEmail,
    expiresAt: expiresAt.toISOString(),
    devFallback,
    devCode: devFallback && adminViewer ? code : null,
  });
});

router.post("/auth/signup/resend", async (req: Request, res: Response): Promise<void> => {
  const parsed = SignupResendBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [existing] = await db
    .select()
    .from(signupVerificationsTable)
    .where(eq(signupVerificationsTable.id, parsed.data.verificationId));

  if (!existing) {
    res.status(404).json({ error: "Verification request not found." });
    return;
  }
  if (existing.consumed) {
    res.status(400).json({ error: "This code was already used." });
    return;
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

  await db
    .update(signupVerificationsTable)
    .set({ code, expiresAt, attempts: 0 })
    .where(eq(signupVerificationsTable.id, existing.id));

  const pl = existing.payload as { username: string };
  let devFallback = false;
  try {
    const result = await sendVerificationEmail({
      to: existing.email,
      code,
      businessName: pl.username ?? "there",
    });
    devFallback = result.devFallback;
  } catch (err) {
    logger.error({ err }, "[signup] resend failed");
    res.status(502).json({ error: "Couldn't resend the email. Try again." });
    return;
  }

  const adminViewer = devFallback && isReplitWorkspaceRequest(req);
  res.json({
    verificationId: existing.id,
    email: existing.email,
    expiresAt: expiresAt.toISOString(),
    devFallback,
    devCode: devFallback && adminViewer ? code : null,
  });
});

router.post("/auth/signup/verify", async (req: Request, res: Response): Promise<void> => {
  const parsed = SignupVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [existing] = await db
    .select()
    .from(signupVerificationsTable)
    .where(eq(signupVerificationsTable.id, parsed.data.verificationId));

  if (!existing) {
    res.status(404).json({ error: "Verification request not found." });
    return;
  }
  if (existing.consumed) {
    res.status(400).json({ error: "This code was already used." });
    return;
  }
  if (existing.expiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "This code expired. Please request a new one." });
    return;
  }
  if (existing.attempts >= MAX_ATTEMPTS) {
    res.status(429).json({ error: "Too many incorrect attempts. Please request a new code." });
    return;
  }

  if (existing.code !== parsed.data.code) {
    await db
      .update(signupVerificationsTable)
      .set({ attempts: existing.attempts + 1 })
      .where(eq(signupVerificationsTable.id, existing.id));
    res.status(400).json({ error: "That code didn't match. Try again." });
    return;
  }

  const pl = existing.payload as {
    email: string;
    username: string;
    role: string;
    zip?: string;
    state: string;
    avatarSeed: string;
    avatarStyle: string;
  };

  const [existingEmail] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, pl.email));
  if (existingEmail) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      email: pl.email,
      username: pl.username,
      role: pl.role,
      zip: pl.zip,
      state: pl.state,
      avatarSeed: pl.avatarSeed,
      avatarStyle: pl.avatarStyle,
    })
    .returning();

  await db
    .update(signupVerificationsTable)
    .set({ consumed: true })
    .where(eq(signupVerificationsTable.id, existing.id));

  const token = generateToken();
  const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessionsTable).values({
    userId: user!.id,
    token,
    expiresAt: sessionExpiresAt,
  });

  emitEvent("user.signed_up", {
    userId: user!.id,
    email: user!.email,
    username: user!.username,
    role: user!.role,
    state: user!.state,
  });

  res.status(201).json({
    user: userPublic(user!),
    sessionToken: token,
    sessionExpiresAt: sessionExpiresAt.toISOString(),
  });
});

router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const token = authHeader.slice(7);

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.token, token),
        gt(sessionsTable.expiresAt, new Date()),
      ),
    );

  if (!session) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({ user: userPublic(user) });
});

router.post("/auth/logout", async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.json({ ok: true });
});

export default router;
