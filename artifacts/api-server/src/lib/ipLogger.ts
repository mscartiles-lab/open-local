import { type Request, type Response, type NextFunction } from "express";
import { db, ipLogsTable } from "@workspace/db";
import { logger } from "./logger";

export function extractIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

const SKIP_PATHS = new Set([
  "/api/health",
  "/api/healthz",
  "/api/messages/unread-count",
]);

function shouldSkip(path: string): boolean {
  const clean = path.split("?")[0];
  if (SKIP_PATHS.has(clean)) return true;
  if (clean.startsWith("/api/storage/")) return true;
  return false;
}

export async function logIp(
  ip: string,
  method: string,
  path: string,
  eventType: string,
  opts: { userId?: number | null; userAgent?: string | null; statusCode?: number | null } = {},
) {
  try {
    await db.insert(ipLogsTable).values({
      ip,
      method,
      path,
      eventType,
      userId: opts.userId ?? null,
      userAgent: opts.userAgent?.slice(0, 512) ?? null,
      statusCode: opts.statusCode ?? null,
    });
  } catch (err) {
    logger.error({ err }, "ip-log insert failed");
  }
}

export function ipLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (shouldSkip(req.path)) {
    next();
    return;
  }

  const ip = extractIp(req);
  const userAgent = req.headers["user-agent"] ?? null;

  res.on("finish", () => {
    const path = req.path.split("?")[0];
    logIp(ip, req.method, path, "visit", {
      userAgent,
      statusCode: res.statusCode,
    }).catch(() => {});
  });

  next();
}
