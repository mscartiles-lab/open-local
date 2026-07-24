import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import type Stripe from "stripe";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";
import { handleAppWebhookEvent } from "./lib/webhookAppHandlers";
import { ipLoggingMiddleware } from "./lib/ipLogger";

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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(ipLoggingMiddleware);

app.use("/api", router);

export default app;
