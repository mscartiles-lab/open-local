import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, emailVerificationsTable, vendorsTable } from "@workspace/db";
import {
  CreateVendorBody,
  GetVendorResponse,
} from "@workspace/api-zod";
import { sendVerificationEmail, generateVerificationCode } from "../lib/email";
import { logger } from "../lib/logger";
import { emitEvent } from "../lib/webhooks";
import { isAdminRequest } from "../lib/requireAdmin";

const router: IRouter = Router();

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const StartBody = z.object({
  email: z.string().email(),
  vendorPayload: CreateVendorBody,
});

const VerifyBody = z.object({
  verificationId: z.number().int().positive(),
  code: z.string().regex(/^\d{6}$/),
});

const ResendBody = z.object({
  verificationId: z.number().int().positive(),
});

router.post("/auth/email/start", async (req, res): Promise<void> => {
  const parsed = StartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, vendorPayload } = parsed.data;

  if (vendorPayload.contactEmail.toLowerCase() !== email.toLowerCase()) {
    res.status(400).json({
      error: "Email must match the contact email on the vendor profile.",
    });
    return;
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);

  const [row] = await db
    .insert(emailVerificationsTable)
    .values({
      email,
      code,
      vendorPayload,
      expiresAt,
    })
    .returning({ id: emailVerificationsTable.id });

  let devFallback = false;
  try {
    const result = await sendVerificationEmail({
      to: email,
      code,
      businessName: vendorPayload.name,
    });
    devFallback = result.devFallback;
  } catch (err) {
    logger.error({ err }, "[verify] failed to send email");
    res.status(502).json({
      error: "Couldn't send the verification email. Please try again.",
    });
    return;
  }

  const adminViewer = devFallback ? await isAdminRequest(req) : false;
  res.status(201).json({
    verificationId: row!.id,
    email,
    expiresAt: expiresAt.toISOString(),
    devFallback,
    devCode: devFallback && adminViewer ? code : null,
  });
});

router.post("/auth/email/resend", async (req, res): Promise<void> => {
  const parsed = ResendBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(emailVerificationsTable)
    .where(eq(emailVerificationsTable.id, parsed.data.verificationId));

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
    .update(emailVerificationsTable)
    .set({ code, expiresAt, attempts: 0 })
    .where(eq(emailVerificationsTable.id, existing.id));

  const payload = existing.vendorPayload as { name: string };
  let devFallback = false;
  try {
    const result = await sendVerificationEmail({
      to: existing.email,
      code,
      businessName: payload.name ?? "your business",
    });
    devFallback = result.devFallback;
  } catch (err) {
    logger.error({ err }, "[verify] resend email failed");
    res.status(502).json({ error: "Couldn't resend the email. Try again." });
    return;
  }

  const adminViewer = devFallback ? await isAdminRequest(req) : false;
  res.json({
    verificationId: existing.id,
    email: existing.email,
    expiresAt: expiresAt.toISOString(),
    devFallback,
    devCode: devFallback && adminViewer ? code : null,
  });
});

router.post("/auth/email/verify", async (req, res): Promise<void> => {
  const parsed = VerifyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(emailVerificationsTable)
    .where(eq(emailVerificationsTable.id, parsed.data.verificationId));

  if (!existing) {
    res.status(404).json({ error: "Verification request not found." });
    return;
  }
  if (existing.consumed) {
    res.status(400).json({ error: "This code was already used." });
    return;
  }
  if (existing.expiresAt.getTime() < Date.now()) {
    res
      .status(400)
      .json({ error: "This code expired. Please request a new one." });
    return;
  }
  if (existing.attempts >= MAX_ATTEMPTS) {
    res
      .status(429)
      .json({ error: "Too many incorrect attempts. Please request a new code." });
    return;
  }

  if (existing.code !== parsed.data.code) {
    await db
      .update(emailVerificationsTable)
      .set({ attempts: existing.attempts + 1 })
      .where(eq(emailVerificationsTable.id, existing.id));
    res.status(400).json({ error: "That code didn't match. Try again." });
    return;
  }

  // Code is valid — create the vendor.
  const payload = existing.vendorPayload as Record<string, unknown>;
  const [vendor] = await db
    .insert(vendorsTable)
    .values(payload as never)
    .returning();

  await db
    .update(emailVerificationsTable)
    .set({ consumed: true })
    .where(eq(emailVerificationsTable.id, existing.id));

  emitEvent("vendor.created", {
    vendorId: vendor.id,
    name: vendor.name,
    slug: vendor.slug,
    category: vendor.category,
    location: vendor.location,
    region: vendor.region,
    contactEmail: vendor.contactEmail,
  });

  res.status(201).json(GetVendorResponse.parse(vendor));
});

export default router;
