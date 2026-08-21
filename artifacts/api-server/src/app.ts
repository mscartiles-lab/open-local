import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import type Stripe from "stripe";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";
import { handleAppWebhookEvent } from "./lib/webhookAppHandlers";
import { ipLoggingMiddleware } from "./lib/ipLogger";

// Origins explicitly permitted for cross-origin requests.
// APP_URL carries the Replit dev-domain in the workspace, while Expo serves its
// browser preview from a separate Replit-managed domain. Both are checked at
// runtime so nothing is hardcoded into the binary for the wrong environment.
const ALLOWED_ORIGINS = new Set(
  [
    "https://openlocalapp.com",
    "https://www.openlocalapp.com",
    process.env.APP_URL ?? "",
    process.env.REPLIT_EXPO_DEV_DOMAIN
      ? `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`
      : "",
  ].filter(Boolean),
);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        const forwarded = req.headers["x-forwarded-for"];
        const ip = forwarded
          ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0]).trim()
          : req.socket?.remoteAddress ?? "unknown";
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
          ip,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      // stripe-replit-sync verifies the signature and updates its mirror tables.
      // If verification fails it throws and our app handler never runs.
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);

      // Now that the signature is verified, parse the raw payload and dispatch
      // to our app-level handler so we can mirror the subscription back onto
      // the originating user/establishment row.
      try {
        const event = JSON.parse((req.body as Buffer).toString("utf8")) as Stripe.Event;
        await handleAppWebhookEvent(event);
      } catch (innerErr) {
        // Don't fail the webhook on app-side errors — Stripe will keep
        // retrying and the sync table is already up to date.
        logger.error({ err: innerErr }, "[stripe-webhook] app handler error");
      }

      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "[stripe-webhook] processing error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

app.use(
  cors({
    // Allow the production domain, workspace domains, and requests that carry
    // no Origin at all (native mobile clients, server-to-server calls).
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.has(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  }),
);

// Security response headers — applied globally to every route.
app.use((_req: Request, res: Response, next: NextFunction) => {
  // Prevent framing by any third-party page.
  res.setHeader("X-Frame-Options", "DENY");
  // Prevent MIME-type sniffing.
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Limit referrer information sent to third parties.
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Disable browser features that this API does not use.
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  // CSP: this is a JSON API — no HTML/scripts are served from here.
  // frame-ancestors 'none' mirrors X-Frame-Options for modern browsers.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'",
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(ipLoggingMiddleware);

app.use("/api", router);

export default app;
