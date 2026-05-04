import { Router, type IRouter } from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { db, establishmentsTable } from "@workspace/db";
import {
  ListEstablishmentsQueryParams,
  SubmitEstablishmentBody,
  UpdateEstablishmentParams,
  UpdateEstablishmentBody,
} from "@workspace/api-zod";
import { issueBusinessBillingToken } from "../lib/billingToken";
import { isValidTier } from "../lib/tiers";

const router: IRouter = Router();

// Sort premium first, then middle, then basic — gives premium customers visibility priority.
// NOTE: Only honor tier ranking when the establishment has a Stripe subscription on file.
// Without this guard, a user could "select Premium" at submit time and get premium
// ranking without actually completing payment in Stripe.
const tierPrioritySql = sql`CASE
  WHEN ${establishmentsTable.stripeSubscriptionId} IS NULL THEN 3
  WHEN ${establishmentsTable.tier} = 'premium' THEN 0
  WHEN ${establishmentsTable.tier} = 'middle' THEN 1
  ELSE 2
END`;

router.get("/establishments", async (req, res): Promise<void> => {
  const parsed = ListEstablishmentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { state, type } = parsed.data;
  const conditions = [eq(establishmentsTable.status, "active")];
  if (state) conditions.push(eq(establishmentsTable.state, state));
  if (type) conditions.push(eq(establishmentsTable.type, type));

  const rows = await db
    .select()
    .from(establishmentsTable)
    .where(and(...conditions))
    .orderBy(tierPrioritySql, asc(establishmentsTable.name));

  res.json(rows);
});

router.post("/establishments/submit", async (req, res): Promise<void> => {
  const parsed = SubmitEstablishmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tier: requestedTier, ...rest } = parsed.data;
  const tier = isValidTier(requestedTier) ? requestedTier : "middle";

  const [row] = await db
    .insert(establishmentsTable)
    .values({ ...rest, tier, status: "pending", isTrial: true })
    .returning();

  req.log.info({ establishmentId: row.id, tier }, "establishment submitted");
  const billingToken = issueBusinessBillingToken(row.id);
  res.status(201).json({ ...row, billingToken });
});

router.patch("/establishments/:id", async (req, res): Promise<void> => {
  const paramParsed = UpdateEstablishmentParams.safeParse(req.params);
  if (!paramParsed.success) {
    res.status(400).json({ error: paramParsed.error.message });
    return;
  }

  const bodyParsed = UpdateEstablishmentBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const [row] = await db
    .update(establishmentsTable)
    .set(bodyParsed.data)
    .where(eq(establishmentsTable.id, paramParsed.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Establishment not found" });
    return;
  }

  res.json(row);
});

export default router;
