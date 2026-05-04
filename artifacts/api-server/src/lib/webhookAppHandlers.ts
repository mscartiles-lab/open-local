import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, usersTable, establishmentsTable } from "@workspace/db";
import { logger } from "./logger";

/**
 * App-level Stripe webhook handler.
 *
 * Runs AFTER stripe-replit-sync has already verified the signature and synced
 * its own `stripe.*` mirror tables. We use the verified event to wire the
 * Stripe subscription back onto the originating user/establishment row so the
 * rest of the app can answer "is this customer paid up?" without re-querying
 * Stripe on every request.
 */
export async function handleAppWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await onCheckoutCompleted(session);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await onSubscriptionDeleted(sub);
      break;
    }
    default:
      // Other event types are fully handled by stripe-replit-sync's mirror
      // tables; no app-side write needed.
      break;
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription") return;

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;
  if (!subscriptionId) {
    logger.warn({ sessionId: session.id }, "[webhook] checkout.session.completed without subscription");
    return;
  }

  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id ?? null;

  const meta = session.metadata ?? {};
  const userId = meta.userId ? Number(meta.userId) : null;
  const establishmentId = meta.establishmentId ? Number(meta.establishmentId) : null;
  const tier = meta.tier;

  if (userId && Number.isFinite(userId)) {
    await db
      .update(usersTable)
      .set({
        stripeSubscriptionId: subscriptionId,
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        ...(tier ? { tier } : {}),
      })
      .where(eq(usersTable.id, userId));
    logger.info({ userId, subscriptionId, tier }, "[webhook] linked subscription to user");
    return;
  }

  if (establishmentId && Number.isFinite(establishmentId)) {
    await db
      .update(establishmentsTable)
      .set({
        stripeSubscriptionId: subscriptionId,
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        ...(tier ? { tier } : {}),
        isTrial: true,
      })
      .where(eq(establishmentsTable.id, establishmentId));
    logger.info({ establishmentId, subscriptionId, tier }, "[webhook] linked subscription to establishment");
    return;
  }

  logger.warn({ sessionId: session.id, meta }, "[webhook] checkout completed without recognised metadata");
}

async function onSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  // Clear the link so subscription-gated UI (e.g. tier-based map sort) reverts
  // to the unpaid baseline.
  const result = await db
    .update(usersTable)
    .set({ stripeSubscriptionId: null })
    .where(eq(usersTable.stripeSubscriptionId, sub.id))
    .returning({ id: usersTable.id });

  const result2 = await db
    .update(establishmentsTable)
    .set({ stripeSubscriptionId: null })
    .where(eq(establishmentsTable.stripeSubscriptionId, sub.id))
    .returning({ id: establishmentsTable.id });

  logger.info(
    { subscriptionId: sub.id, usersCleared: result.length, establishmentsCleared: result2.length },
    "[webhook] cleared subscription links",
  );
}
