import { Router, type IRouter } from "express";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { db, vendorsTable, productsTable } from "@workspace/db";
import { emitEvent } from "../lib/webhooks";
import { fireWelcome } from "../lib/onboarding";
import {
  ListVendorsQueryParams,
  CreateVendorBody,
  GetVendorParams,
  UpdateVendorParams,
  UpdateVendorBody,
  DeleteVendorParams,
  ListVendorProductsParams,
  ListVendorsResponse,
  GetVendorResponse,
  UpdateVendorResponse,
  ListFeaturedVendorsResponse,
  ListVendorProductsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/vendors", async (req, res): Promise<void> => {
  const parsed = ListVendorsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, category, location, featured } = parsed.data;
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(vendorsTable.name, `%${search}%`),
        ilike(vendorsTable.tagline, `%${search}%`),
        ilike(vendorsTable.description, `%${search}%`),
      ),
    );
  }
  if (category) conditions.push(eq(vendorsTable.category, category));
  if (location) conditions.push(eq(vendorsTable.location, location));
  if (featured !== undefined) conditions.push(eq(vendorsTable.featured, featured));

  const rows = await db
    .select()
    .from(vendorsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(vendorsTable.name);

  res.json(ListVendorsResponse.parse(rows));
});

router.get("/vendors/featured", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.featured, true))
    .orderBy(vendorsTable.name);
  res.json(ListFeaturedVendorsResponse.parse(rows));
});

router.post("/vendors", async (req, res): Promise<void> => {
  const parsed = CreateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(vendorsTable).values(parsed.data).returning();
  emitEvent("vendor.created", {
    vendorId: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    location: row.location,
    region: row.region,
    contactEmail: row.contactEmail,
  });
  await fireWelcome(row);
  // Re-read so the response reflects the welcome marker that fireWelcome
  // just appended to onboarding_emails_sent.
  const [fresh] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, row.id));
  res.status(201).json(GetVendorResponse.parse(fresh ?? row));
});

router.get("/vendors/by-slug/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.slug, slug));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(GetVendorResponse.parse(vendor));
});

router.get("/vendors/:id", async (req, res): Promise<void> => {
  const params = GetVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(GetVendorResponse.parse(row));
});

router.patch("/vendors/:id", async (req, res): Promise<void> => {
  const params = UpdateVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateVendorBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [row] = await db
    .update(vendorsTable)
    .set(body.data)
    .where(eq(vendorsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(UpdateVendorResponse.parse(row));
});

router.delete("/vendors/:id", async (req, res): Promise<void> => {
  const params = DeleteVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(vendorsTable)
    .where(eq(vendorsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/vendors/:id/products", async (req, res): Promise<void> => {
  const params = ListVendorProductsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.vendorId, params.data.id))
    .orderBy(productsTable.name);
  res.json(ListVendorProductsResponse.parse(rows));
});

// Suppress unused-import lint
void sql;

export default router;
