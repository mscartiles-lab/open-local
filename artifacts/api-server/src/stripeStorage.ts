import { sql } from "drizzle-orm";
import { db, usersTable, establishmentsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

export class StripeStorage {
  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`,
    );
    return result.rows[0] ?? null;
  }

  async getActivePrice(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE product = ${productId} AND active = true LIMIT 1`,
    );
    return result.rows[0] ?? null;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`,
    );
    return result.rows[0] ?? null;
  }

  async getCustomerByEmail(email: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.customers WHERE email = ${email} AND deleted = false LIMIT 1`,
    );
    return result.rows[0] ?? null;
  }

  async getUserById(id: number) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user ?? null;
  }

  async updateUserStripe(userId: number, stripeCustomerId: string, stripeSubscriptionId?: string) {
    await db
      .update(usersTable)
      .set({ stripeCustomerId, stripeSubscriptionId })
      .where(eq(usersTable.id, userId));
  }

  async getEstablishmentById(id: number) {
    const [est] = await db.select().from(establishmentsTable).where(eq(establishmentsTable.id, id));
    return est ?? null;
  }

  async updateEstablishmentStripe(estId: number, stripeCustomerId: string, stripeSubscriptionId?: string) {
    await db
      .update(establishmentsTable)
      .set({ stripeCustomerId, stripeSubscriptionId })
      .where(eq(establishmentsTable.id, estId));
  }

  async countVendorUsers() {
    const [row] = await db
      .select({ total: count() })
      .from(usersTable)
      .where(eq(usersTable.role, "vendor"));
    return row?.total ?? 0;
  }

  async countEstablishments() {
    const [row] = await db.select({ total: count() }).from(establishmentsTable);
    return row?.total ?? 0;
  }
}

export const stripeStorage = new StripeStorage();
