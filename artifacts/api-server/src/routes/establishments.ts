import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, establishmentsTable } from "@workspace/db";
import {
  ListEstablishmentsQueryParams,
  SubmitEstablishmentBody,
  UpdateEstablishmentParams,
  UpdateEstablishmentBody,
} from "@workspace/api-zod";
import { z } from "zod";

const router: IRouter = Router();

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
    .orderBy(establishmentsTable.name);

  res.json(rows);
});

router.post("/establishments/submit", async (req, res): Promise<void> => {
  const parsed = SubmitEstablishmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(establishmentsTable)
    .values({ ...parsed.data, status: "pending", isTrial: true })
    .returning();

  req.log.info({ establishmentId: row.id }, "establishment submitted");
  res.status(201).json(row);
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
