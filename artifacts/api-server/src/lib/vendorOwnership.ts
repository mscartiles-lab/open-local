import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db, usersTable, vendorsTable } from "@workspace/db";
import { isAdminEmail } from "./requireAdmin";

export async function getVendorForUser(userId: number) {
  const [user] = await db
    .select({ email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user || user.role === "admin") return null;

  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(
      or(
        eq(vendorsTable.ownerUserId, userId),
        and(
          isNull(vendorsTable.ownerUserId),
          sql`lower(${vendorsTable.contactEmail}) = lower(${user.email})`,
        ),
      ),
    )
    .orderBy(sql`${vendorsTable.ownerUserId} = ${userId} desc`)
    .limit(1);

  if (vendor && vendor.ownerUserId === null) {
    const [claimed] = await db
      .update(vendorsTable)
      .set({ ownerUserId: userId })
      .where(and(eq(vendorsTable.id, vendor.id), isNull(vendorsTable.ownerUserId)))
      .returning();
    return claimed ?? vendor;
  }
  return vendor ?? null;
}

export async function claimVendorForUser(userId: number, vendorId: number): Promise<boolean> {
  const [existing] = await db
    .select({ ownerUserId: vendorsTable.ownerUserId })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId));
  if (!existing) return false;
  if (existing.ownerUserId === userId) return true;
  if (existing.ownerUserId !== null) return false;
  const [claimed] = await db
    .update(vendorsTable)
    .set({ ownerUserId: userId })
    .where(and(eq(vendorsTable.id, vendorId), isNull(vendorsTable.ownerUserId)))
    .returning({ id: vendorsTable.id });
  return Boolean(claimed);
}

// Returns true if the given user owns the vendor (owner id, then legacy email) or is an admin.
export async function userOwnsVendor(userId: number, vendorId: number): Promise<boolean> {
  const [u] = await db
    .select({ email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!u) return false;
  if (u.role === "admin" || isAdminEmail(u.email)) return true;
  const [v] = await db
    .select({
      contactEmail: vendorsTable.contactEmail,
      ownerUserId: vendorsTable.ownerUserId,
    })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId));
  if (!v) return false;
  if (v.ownerUserId === userId) return true;
  if (v.ownerUserId !== null || v.contactEmail.toLowerCase() !== u.email.toLowerCase()) {
    return false;
  }
  return claimVendorForUser(userId, vendorId);
}
