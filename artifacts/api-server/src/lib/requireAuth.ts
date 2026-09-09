import type { Request, Response, NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";
import { isBlockedUserId } from "./blockedUsers";

export interface AuthRequest extends Request {
  userId: number;
}

export async function getOptionalAuthUserId(req: Request): Promise<number | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const [session] = await db
    .select({ userId: sessionsTable.userId })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())));
  if (!session || isBlockedUserId(session.userId)) return null;
  return session.userId;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.headers.authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const userId = await getOptionalAuthUserId(req);
  if (userId === null) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  (req as AuthRequest).userId = userId;
  next();
}
