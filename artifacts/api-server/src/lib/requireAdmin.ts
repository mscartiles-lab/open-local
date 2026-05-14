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

// Returns true only when the request is hitting the Replit *workspace* dev
// environment (the editor preview that only Replit collaborators on this Repl
// can reach), not the published deployment. Used to gate dev-mode reveals
// (verification codes) so they're only ever visible inside the Replit editor.
//
// `REPLIT_DEPLOYMENT` is set to "1" in published deployments and absent in the
// workspace, so its absence is the marker for "we're in the dev sandbox the
// Repl owner is looking at right now."
export function isReplitWorkspaceRequest(_req: Request): boolean {
  return process.env.REPLIT_DEPLOYMENT !== "1";
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
