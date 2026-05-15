import { Router, type IRouter } from "express";
import { eq, and, ilike, or, sql, notExists, gt } from "drizzle-orm";
import { db, vendorsTable, productsTable, usersTable, sessionsTable } from "@workspace/db";
import { isAdminEmail } from "../lib/requireAdmin";
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

// Hides any vendor whose contactEmail matches a user row that's paused
// (i.e. their trial expired with no live subscription). The vendor's own
// dashboard route doesn't apply this filter — they can still log in and
// re-subscribe through /billing.
function notPausedVendorCondition() {
  return notExists(
    db
      .select({ one: sql`1` })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.email, vendorsTable.contactEmail),
          eq(usersTable.paused, true),
        ),
      ),
  );
}
export { notPausedVendorCondition };

router.get("/vendors", async (req, res): Promise<void> => {
  const parsed = ListVendorsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, category, location, featured } = parsed.data;
  const conditions: ReturnType<typeof and>[] = [notPausedVendorCondition()];
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
    .where(and(eq(vendorsTable.featured, true), notPausedVendorCondition()))
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

// Resolves the requesting user from a Bearer token without enforcing auth.
// Used by /vendors/by-slug/:slug to bypass the paused-vendor filter when the
// caller owns the vendor or is an admin (so a paused vendor's dashboard still
// loads), while keeping anonymous discovery filtered.
async function resolveOptionalUser(req: { headers: { authorization?: string } }): Promise<{ email: string; role: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())));
  if (!session) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  return user ? { email: user.email, role: user.role } : null;
}

router.get("/vendors/by-slug/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  // First do a paused-aware lookup (public discovery view).
  let [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(and(eq(vendorsTable.slug, slug), notPausedVendorCondition()));
  // If nothing matched, the vendor may exist but be paused — let the owner
  // (matching contactEmail) or an admin fetch it anyway so the dashboard
  // remains reachable and they can re-subscribe via /billing.
  if (!vendor) {
    const caller = await resolveOptionalUser(req);
    if (caller) {
      const [maybe] = await db
        .select()
        .from(vendorsTable)
        .where(eq(vendorsTable.slug, slug));
      const isOwner = maybe && maybe.contactEmail.toLowerCase() === caller.email.toLowerCase();
      const isAdmin = caller.role === "admin" || isAdminEmail(caller.email);
      if (maybe && (isOwner || isAdmin)) vendor = maybe;
    }
  }
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
    .where(and(eq(vendorsTable.id, params.data.id), notPausedVendorCondition()));
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
