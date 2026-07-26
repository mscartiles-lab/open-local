import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import { db, usersTable, sessionsTable, signupVerificationsTable, vendorsTable } from "@workspace/db";
import { generateVerificationCode, sendVerificationEmail, sendDirectEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { emitEvent } from "../lib/webhooks";
import { isAdminEmail, isReplitWorkspaceRequest } from "../lib/requireAdmin";
import { logIp, extractIp } from "../lib/ipLogger";
import { getAppUrl } from "../lib/appUrl";

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
  const effectiveRole = (user.role === "admin" || isAdminEmail(user.email)) ? "admin" : user.role;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatarSeed: user.avatarSeed,
    avatarStyle: user.avatarStyle,
    role: effectiveRole,
    zip: user.zip,
    state: user.state,
    tier: user.tier ?? null,
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

  const signupIp = extractIp(req);
  req.log.info({ ip: signupIp, email: normalizedEmail, username }, "signup OTP generated");
  void logIp(signupIp, "POST", "/auth/signup/start", "signup_attempt", { userAgent: req.headers["user-agent"] });
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
    void logIp(extractIp(req), "POST", "/auth/signup/verify", "signup_failure", { userAgent: req.headers["user-agent"] });
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

  // Send shopper welcome email directly via EmailJS. Vendors get their welcome
  // via fireWelcome() after the vendor profile is created (not at user signup).
  if (user!.role === "shopper") {
    const appUrl = getAppUrl();
    void sendDirectEmail({
      to: user!.email,
      toName: user!.username,
      subject: "Welcome to Open Local!",
      message: `Hi ${user!.username},\n\nWelcome to Open Local — the marketplace connecting neighbors with local producers, farms, bakeries, and makers.\n\nHere's what you can do:\n• Browse local vendors near you\n• Save your favorite producers\n• Grab fresh batch drops and market surplus before they sell out\n• Pre-order for upcoming market pickups\n\nExplore the marketplace:\n${appUrl}\n\nWe're so glad you're here.\n\nThe Open Local team`,
    }).catch((err) => logger.error({ err }, "shopper welcome email failed"));
  }

  void logIp(extractIp(req), "POST", "/auth/signup/verify", "signup_success", { userId: user!.id, userAgent: req.headers["user-agent"] });
  res.status(201).json({
    user: userPublic(user!),
    sessionToken: token,
    sessionExpiresAt: sessionExpiresAt.toISOString(),
  });
});

// ─── Login (OTP for existing users) ──────────────────────────────────────────

const LoginStartBody = z.object({
  email: z.string().email(),
});

const LoginVerifyBody = z.object({
  verificationId: z.number().int().positive(),
  code: z.string().regex(/^\d{6}$/),
});

router.post("/auth/login/start", async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginStartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (!user) {
    res.status(404).json({ error: "No account found with that email address." });
    return;
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

  const [row] = await db
    .insert(signupVerificationsTable)
    .values({
      email: normalizedEmail,
      code,
      payload: { type: "login", userId: user.id },
      expiresAt,
    })
    .returning({ id: signupVerificationsTable.id });

  let devFallback = false;
  try {
    const result = await sendVerificationEmail({
      to: normalizedEmail,
      code,
      businessName: user.username,
    });
    devFallback = result.devFallback;
  } catch (err) {
    logger.error({ err }, "[login] failed to send verification email");
    res.status(502).json({ error: "Couldn't send the login code. Please try again." });
    return;
  }

  const loginIp = extractIp(req);
  req.log.info({ ip: loginIp, email: normalizedEmail, userId: user.id }, "login OTP generated");
  void logIp(loginIp, "POST", "/auth/login/start", "login_attempt", { userAgent: req.headers["user-agent"] });
  const adminViewer = devFallback && isReplitWorkspaceRequest(req);
  res.json({
    verificationId: row!.id,
    email: normalizedEmail,
    expiresAt: expiresAt.toISOString(),
    devFallback,
    devCode: devFallback && adminViewer ? code : null,
  });
});

router.post("/auth/login/verify", async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [existing] = await db
    .select()
    .from(signupVerificationsTable)
    .where(eq(signupVerificationsTable.id, parsed.data.verificationId));

  if (!existing) {
    res.status(404).json({ error: "Login request not found." });
    return;
  }
  if (existing.consumed) {
    res.status(400).json({ error: "This code has already been used." });
    return;
  }
  if (new Date() > existing.expiresAt) {
    res.status(400).json({ error: "This code has expired. Please request a new one." });
    return;
  }
  if ((existing.attempts ?? 0) >= MAX_ATTEMPTS) {
    res.status(400).json({ error: "Too many attempts. Please request a new code." });
    return;
  }

  const pl = existing.payload as { type?: string; userId?: number };
  if (pl?.type !== "login" || !pl?.userId) {
    res.status(400).json({ error: "Invalid login request." });
    return;
  }

  if (existing.code !== parsed.data.code) {
    await db
      .update(signupVerificationsTable)
      .set({ attempts: (existing.attempts ?? 0) + 1 })
      .where(eq(signupVerificationsTable.id, existing.id));
    void logIp(extractIp(req), "POST", "/auth/login/verify", "login_failure", { userAgent: req.headers["user-agent"] });
    res.status(400).json({ error: "Incorrect code. Please try again." });
    return;
  }

  await db
    .update(signupVerificationsTable)
    .set({ consumed: true })
    .where(eq(signupVerificationsTable.id, existing.id));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, pl.userId));

  if (!user) {
    res.status(404).json({ error: "Account not found." });
    return;
  }

  const token = generateToken();
  const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessionsTable).values({
    userId: user.id,
    token,
    expiresAt: sessionExpiresAt,
  });

  void logIp(extractIp(req), "POST", "/auth/login/verify", "login_success", { userId: user.id, userAgent: req.headers["user-agent"] });
  res.json({
    user: userPublic(user),
    sessionToken: token,
    sessionExpiresAt: sessionExpiresAt.toISOString(),
  });
});

// ─── Me / Logout ─────────────────────────────────────────────────────────────

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

  let vendorSlug: string | null = null;
  if (user.role === "vendor") {
    const [vendor] = await db
      .select({ slug: vendorsTable.slug })
      .from(vendorsTable)
      .where(eq(vendorsTable.contactEmail, user.email))
      .limit(1);
    vendorSlug = vendor?.slug ?? null;
  }

  res.json({ user: { ...userPublic(user), vendorSlug } });
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
