import { Router, type IRouter } from "express";
import { eq, sql, countDistinct, count } from "drizzle-orm";
import { db, vendorsTable, productsTable } from "@workspace/db";
import {
  GetMarketplaceStatsResponse,
  ListLocationsResponse,
  ListCategoriesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const [vendorAgg] = await db
    .select({
      vendorCount: count(vendorsTable.id),
      locationCount: countDistinct(vendorsTable.location),
      categoryCount: countDistinct(vendorsTable.category),
      featuredVendorCount: sql<number>`count(*) filter (where ${vendorsTable.featured} = true)`.mapWith(
        Number,
      ),
    })
    .from(vendorsTable);

  const [productAgg] = await db
    .select({
      productCount: count(productsTable.id),
      inStockCount: sql<number>`count(*) filter (where ${productsTable.inStock} = true)`.mapWith(
        Number,
      ),
    })
    .from(productsTable);

  res.json(
    GetMarketplaceStatsResponse.parse({
      vendorCount: vendorAgg?.vendorCount ?? 0,
      productCount: productAgg?.productCount ?? 0,
      locationCount: vendorAgg?.locationCount ?? 0,
      categoryCount: vendorAgg?.categoryCount ?? 0,
      inStockCount: productAgg?.inStockCount ?? 0,
      featuredVendorCount: vendorAgg?.featuredVendorCount ?? 0,
    }),
  );
});

router.get("/locations", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      location: vendorsTable.location,
      region: vendorsTable.region,
      vendorCount: count(vendorsTable.id),
    })
    .from(vendorsTable)
    .groupBy(vendorsTable.location, vendorsTable.region)
    .orderBy(vendorsTable.location);
  res.json(ListLocationsResponse.parse(rows));
});

router.get("/categories", async (_req, res): Promise<void> => {
  const vendorRows = await db
    .select({
      name: vendorsTable.category,
      count: count(vendorsTable.id),
    })
    .from(vendorsTable)
    .groupBy(vendorsTable.category)
    .orderBy(vendorsTable.category);

  const productRows = await db
    .select({
      name: productsTable.category,
      count: count(productsTable.id),
    })
    .from(productsTable)
    .groupBy(productsTable.category)
    .orderBy(productsTable.category);

  res.json(
    ListCategoriesResponse.parse({
      vendorCategories: vendorRows,
      productCategories: productRows,
    }),
  );
});

// Filter clauses use eq() and sql; suppress unused import lint
void eq;

export default router;
