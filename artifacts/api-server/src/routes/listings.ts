import { Router, type IRouter } from "express";
import { eq, and, ilike, or } from "drizzle-orm";
import { db, listingsTable } from "@workspace/db";
import { ListListingsQueryParams, CreateListingBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/listings", async (req, res): Promise<void> => {
  const parsed = ListListingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, category, city, search } = parsed.data;
  const conditions = [eq(listingsTable.status, "active")];
  if (type) conditions.push(eq(listingsTable.type, type));
  if (category) conditions.push(eq(listingsTable.category, category));
  if (city) conditions.push(ilike(listingsTable.city, `%${city}%`));
  if (search) {
    conditions.push(
      or(
        ilike(listingsTable.title, `%${search}%`),
        ilike(listingsTable.description, `%${search}%`),
        ilike(listingsTable.city, `%${search}%`),
      ) as ReturnType<typeof eq>,
    );
  }

  const rows = await db
    .select()
    .from(listingsTable)
    .where(and(...conditions))
    .orderBy(listingsTable.createdAt);

  res.json(rows.reverse());
});

router.post("/listings", async (req, res): Promise<void> => {
  const parsed = CreateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, description, type, category, city, state, contactName, contactEmail } = parsed.data;

  const [row] = await db
    .insert(listingsTable)
    .values({
      title,
      description,
      type,
      category,
      city,
      state: state ?? "FL",
      contactName,
      contactEmail,
    })
    .returning();

  res.status(201).json(row);
});

export default router;
