import { eq } from "drizzle-orm";
import { db, usersTable, vendorsTable } from "@workspace/db";
import { isAdminEmail } from "./requireAdmin";

// Returns true if the given user owns the vendor (contactEmail match) or is an admin.
export async function userOwnsVendor(userId: number, vendorId: number): Promise<boolean> {
  const [u] = await db
    .select({ email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!u) return false;
  if (u.role === "admin" || isAdminEmail(u.email)) return true;
  const [v] = await db
    .select({ contactEmail: vendorsTable.contactEmail })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId));
  if (!v) return false;
  return v.contactEmail.toLowerCase() === u.email.toLowerCase();
}
