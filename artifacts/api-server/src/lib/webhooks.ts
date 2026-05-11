import { createHmac, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  webhookSubscriptionsTable,
  webhookDeliveriesTable,
} from "@workspace/db";
import { logger } from "./logger";

// All event names the marketplace can emit. Listing them in one place keeps
// docs and admin UI honest about what subscribers can pick from.
export const WEBHOOK_EVENTS = [
  "user.signed_up",
  "vendor.created",
  "vendor.visit_requested",
  "vendor.visit_approved",
  "vendor.visit_rejected",
  "business.submitted",
  "business.status_changed",
  "product.created",
  "offer.created",
  // Reserved for future flows that don't have triggers yet:
  "purchase.completed",
  "reminder.sent",
  "recommendation.generated",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function newWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

interface DeliverArgs {
  subscriptionId: number;
  url: string;
  secret: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
}

async function logDelivery(
  args: DeliverArgs,
  attempt: number,
  statusCode: number | null,
  ok: boolean,
  error: string | null,
): Promise<void> {
  try {
    await db.insert(webhookDeliveriesTable).values({
      subscriptionId: args.subscriptionId,
      event: args.event,
      payload: args.payload,
      statusCode,
      ok,
      attempt,
      error,
    });
  } catch (e) {
    // Never let log-write failures cascade.
    logger.error({ err: e, event: args.event, sub: args.subscriptionId }, "webhook delivery log failed");
  }
}

async function deliverOnce(args: DeliverArgs, attempt: number): Promise<{
  ok: boolean;
  status?: number;
  error?: string;
}> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({
    event: args.event,
    timestamp,
    data: args.payload,
  });
  const signature = createHmac("sha256", args.secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  let statusCode: number | null = null;
  let ok = false;
  let errorMsg: string | null = null;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(args.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "OpenLocal-Webhooks/1.0",
        "x-openlocal-event": args.event,
        "x-openlocal-timestamp": timestamp,
        "x-openlocal-signature": `sha256=${signature}`,
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(t);
    statusCode = r.status;
    ok = r.ok;
    errorMsg = ok ? null : `HTTP ${r.status}`;
  } catch (e) {
    errorMsg = (e as Error).message ?? "unknown error";
  }

  await logDelivery(args, attempt, statusCode, ok, errorMsg);
  return { ok, status: statusCode ?? undefined, error: errorMsg ?? undefined };
}

// Reject URLs that point at localhost, private/link-local/loopback CIDRs, or
// non-HTTPS schemes. Defends against SSRF if an admin account is compromised.
const PRIVATE_IPV4 =
  /^(?:10|127|0)\.|^169\.254\.|^192\.168\.|^172\.(?:1[6-9]|2\d|3[01])\./;
const PRIVATE_HOSTS = new Set([
  "localhost", "ip6-localhost", "ip6-loopback", "metadata.google.internal",
]);

export function isWebhookUrlAllowed(rawUrl: string): { ok: true } | { ok: false; reason: string } {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
  if (process.env.NODE_ENV === "production" && u.protocol !== "https:") {
    return { ok: false, reason: "URL must use https://" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, reason: "URL must use http(s)://" };
  }
  const host = u.hostname.toLowerCase();
  if (PRIVATE_HOSTS.has(host)) return { ok: false, reason: "Private host blocked" };
  if (PRIVATE_IPV4.test(host)) return { ok: false, reason: "Private IP blocked" };
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) {
    return { ok: false, reason: "Private IPv6 blocked" };
  }
  return { ok: true };
}

// Fire-and-forget. Resolves once we've enqueued; never throws back to the
// caller so a webhook problem can't break a user-facing request.
export function emitEvent(event: WebhookEvent, payload: Record<string, unknown>): void {
  void (async () => {
    try {
      const subs = await db
        .select()
        .from(webhookSubscriptionsTable)
        .where(eq(webhookSubscriptionsTable.active, true));

      const targets = subs.filter(
        (s) => Array.isArray(s.events) && s.events.includes(event),
      );
      if (targets.length === 0) return;

      // Use allSettled so one bad subscription can't block the others.
      await Promise.allSettled(
        targets.map(async (s) => {
          const args = {
            subscriptionId: s.id,
            url: s.url,
            secret: s.secret,
            event,
            payload,
          };
          const first = await deliverOnce(args, 1);
          if (first.ok) return;
          // One quick retry after 1s for transient failures.
          await new Promise((r) => setTimeout(r, 1000));
          await deliverOnce(args, 2);
        }),
      );
    } catch (e) {
      logger.error({ err: e, event }, "webhook emit failed");
    }
  })();
}
