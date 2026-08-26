/**
 * One-time geocoding backfill.
 * Called at server startup; finds any vendor with NULL latitude and geocodes
 * them via Nominatim (ZIP → city fallback), respecting the 1 req/s rate limit.
 * Idempotent — safe to re-run on every cold start.
 */

import { isNull, or } from "drizzle-orm";
import { db, vendorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { geocodeVendor } from "./geocode";
import { logger } from "./logger";

export async function backfillMissingGeocodes(): Promise<void> {
  // Select vendors missing either coordinate — a row with valid latitude but
  // null longitude still has no usable map pin and must be retried.
  const missing = await db
    .select({
      id: vendorsTable.id,
      zipCode: vendorsTable.zipCode,
      location: vendorsTable.location,
    })
    .from(vendorsTable)
    .where(or(isNull(vendorsTable.latitude), isNull(vendorsTable.longitude)));

  if (missing.length === 0) {
    logger.info("geocode backfill: no vendors missing coordinates");
    return;
  }

  logger.info({ count: missing.length }, "geocode backfill: starting");
  let updated = 0;
  let failed = 0;

  for (const v of missing) {
    const coords = await geocodeVendor(v.zipCode, v.location);
    if (coords) {
      await db
        .update(vendorsTable)
        .set({ latitude: coords.latitude, longitude: coords.longitude })
        .where(eq(vendorsTable.id, v.id));
      updated++;
      logger.info({ vendorId: v.id, ...coords }, "geocode backfill: updated vendor");
    } else {
      failed++;
      logger.warn({ vendorId: v.id }, "geocode backfill: could not geocode vendor");
    }
    // Respect Nominatim's 1 req/s policy
    await new Promise((r) => setTimeout(r, 1100));
  }

  logger.info({ updated, failed }, "geocode backfill: complete");
}
