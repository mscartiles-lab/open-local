import { Router, type IRouter } from "express";
import { eq, and, gte, ilike, or } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import { ListEventsQueryParams, CreateEventBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events", async (req, res): Promise<void> => {
  const parsed = ListEventsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, city, search, upcoming } = parsed.data;
  const conditions = [eq(eventsTable.status, "active")];

  if (upcoming) conditions.push(gte(eventsTable.startsAt, new Date()));
  if (category) conditions.push(eq(eventsTable.category, category));
  if (city) conditions.push(ilike(eventsTable.city, `%${city}%`));
  if (search) {
    conditions.push(
      or(
        ilike(eventsTable.title, `%${search}%`),
        ilike(eventsTable.description, `%${search}%`),
        ilike(eventsTable.venueName, `%${search}%`),
        ilike(eventsTable.city, `%${search}%`),
      ) as ReturnType<typeof eq>,
    );
  }

  const rows = await db
    .select()
    .from(eventsTable)
    .where(and(...conditions))
    .orderBy(eventsTable.startsAt);

  res.json(rows);
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    title, description, category, venueName, address,
    city, state, startsAt, endsAt, isFree, priceCents,
    ticketUrl, imageUrl, organizerName, organizerEmail,
  } = parsed.data;

  const [row] = await db
    .insert(eventsTable)
    .values({
      title,
      description,
      category,
      venueName,
      address,
      city,
      state: state ?? "FL",
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      isFree: isFree ?? true,
      priceCents: priceCents ?? null,
      ticketUrl: ticketUrl ?? null,
      imageUrl: imageUrl ?? null,
      organizerName,
      organizerEmail,
    })
    .returning();

  res.status(201).json(row);
});

export default router;
