import type { Request, Response, NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable } from "@workspace/db";
import type { AuthRequest } from "./requireAuth";

function getAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().has(email.toLowerCase());
}

// Non-blocking admin check — returns true if the request carries a valid
// session for an admin user. Used to gate dev-mode reveals (verification
// codes) so only admins ever see them.
export async function isAdminRequest(req: Request): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  try {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())));
    if (!session) return false;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
    if (!user) return false;
    return user.role === "admin" || getAdminEmails().has(user.email.toLowerCase());
  } catch {
    return false;
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = authHeader.slice(7);
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())));

  if (!session) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const adminEmails = getAdminEmails();
  const isAdmin = user.role === "admin" || adminEmails.has(user.email.toLowerCase());

  if (!isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  (req as AuthRequest).userId = user.id;
  next();
}
