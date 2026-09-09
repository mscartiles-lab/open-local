import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, waitlistTable } from "@workspace/db";
import { getAppUrl } from "./appUrl";

const TOKEN_VERSION = 1;

function getSigningSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required to create unsubscribe links");
  }
  return secret;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sign(payload: string): string {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

export function createUnsubscribeToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ version: TOKEN_VERSION, email: normalizeEmail(email) }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [payload, providedSignature, ...rest] = token.split(".");
  if (!payload || !providedSignature || rest.length > 0) return null;

  const expectedSignature = sign(payload);
  const expected = Buffer.from(expectedSignature);
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      version?: unknown;
      email?: unknown;
    };
    if (decoded.version !== TOKEN_VERSION || typeof decoded.email !== "string") {
      return null;
    }
    const email = normalizeEmail(decoded.email);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  } catch {
    return null;
  }
}

export function createUnsubscribeUrl(email: string): string {
  const token = encodeURIComponent(createUnsubscribeToken(email));
  return `${getAppUrl()}/api/email/unsubscribe?token=${token}`;
}

export async function isEmailUnsubscribed(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const [[user], [waitlistEntry]] = await Promise.all([
    db
      .select({ unsubscribed: usersTable.emailUnsubscribed })
      .from(usersTable)
      .where(eq(usersTable.email, normalized))
      .limit(1),
    db
      .select({ unsubscribed: waitlistTable.unsubscribed })
      .from(waitlistTable)
      .where(eq(waitlistTable.email, normalized))
      .limit(1),
  ]);
  return user?.unsubscribed === true || waitlistEntry?.unsubscribed === true;
}

export async function unsubscribeEmail(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await Promise.all([
    db
      .update(usersTable)
      .set({ emailUnsubscribed: true })
      .where(eq(usersTable.email, normalized)),
    db
      .update(waitlistTable)
      .set({ unsubscribed: true })
      .where(eq(waitlistTable.email, normalized)),
  ]);
}