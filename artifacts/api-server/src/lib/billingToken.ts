import crypto from "node:crypto";

const TTL_MS = 30 * 60 * 1000;

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is required for billing tokens");
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function issueBusinessBillingToken(establishmentId: number): string {
  const expiresAt = Date.now() + TTL_MS;
  const payload = `${establishmentId}.${expiresAt}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyBusinessBillingToken(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [idStr, expStr, sig] = parts;
  const id = Number(idStr);
  const exp = Number(expStr);
  if (!Number.isFinite(id) || !Number.isFinite(exp)) return null;
  if (Date.now() > exp) return null;
  const expected = sign(`${idStr}.${expStr}`);
  if (!safeEq(sig, expected)) return null;
  return id;
}
