import { Router, type IRouter } from "express";
import {
  and,
  desc,
  eq,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import {
  db,
  conversationsTable,
  messagesTable,
  usersTable,
  vendorsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";

const router: IRouter = Router();

// Resolve the vendor row owned by the authenticated user (if any).
async function getMyVendor(userId: number) {
  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) return null;
  const [vendor] = await db
    .select({ id: vendorsTable.id })
    .from(vendorsTable)
    .where(eq(vendorsTable.contactEmail, user.email));
  return vendor ?? null;
}

// Assert the caller is a participant in the conversation.
// Returns { conversation, myVendorId } or null if unauthorised.
async function assertParticipant(
  convId: number,
  userId: number,
): Promise<{ conv: typeof conversationsTable.$inferSelect; myVendorId: number | null } | null> {
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId));
  if (!conv) return null;
  if (conv.shopperUserId === userId) return { conv, myVendorId: null };
  const myVendor = await getMyVendor(userId);
  if (myVendor && myVendor.id === conv.vendorId) return { conv, myVendorId: myVendor.id };
  return null;
}

// POST /api/messages/conversations { vendorId }
// Shopper opens (or retrieves existing) conversation with a vendor.
router.post("/messages/conversations", requireAuth, async (req, res): Promise<void> => {
  const parsed = z.object({ vendorId: z.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "vendorId required" });
    return;
  }
  const userId = (req as AuthRequest).userId;
  const { vendorId } = parsed.data;

  const [vendor] = await db
    .select({ id: vendorsTable.id })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  // Upsert: one conversation per (shopper, vendor) pair.
  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.shopperUserId, userId),
        eq(conversationsTable.vendorId, vendorId),
      ),
    );
  if (existing) {
    res.json(existing);
    return;
  }

  const [created] = await db
    .insert(conversationsTable)
    .values({ shopperUserId: userId, vendorId })
    .returning();
  res.status(201).json(created);
});

// GET /api/messages/conversations
// List all conversations for the authenticated user (shopper or vendor).
router.get("/messages/conversations", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const myVendor = await getMyVendor(userId);

  // Build the where clause depending on role
  const whereClause = myVendor
    ? eq(conversationsTable.vendorId, myVendor.id)
    : eq(conversationsTable.shopperUserId, userId);

  const convs = await db
    .select()
    .from(conversationsTable)
    .where(whereClause)
    .orderBy(desc(conversationsTable.updatedAt));

  if (convs.length === 0) {
    res.json([]);
    return;
  }

  // Enrich each conversation with last message + unread count + names
  const enriched = await Promise.all(
    convs.map(async (conv) => {
      const [lastMsg] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

      // Unread = messages sent by the OTHER party that have no readAt
      const unreadResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.conversationId, conv.id),
            isNull(messagesTable.readAt),
            // Not sent by me
            sql`${messagesTable.senderUserId} != ${userId}`,
          ),
        );
      const unreadCount = unreadResult[0]?.count ?? 0;

      const [shopper] = await db
        .select({ id: usersTable.id, username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.id, conv.shopperUserId));

      const [vendor] = await db
        .select({ id: vendorsTable.id, name: vendorsTable.name, imageUrl: vendorsTable.imageUrl, slug: vendorsTable.slug })
        .from(vendorsTable)
        .where(eq(vendorsTable.id, conv.vendorId));

      return {
        ...conv,
        lastMessage: lastMsg ?? null,
        unreadCount,
        shopper: shopper ?? null,
        vendor: vendor ?? null,
      };
    }),
  );

  res.json(enriched);
});

// GET /api/messages/unread-count
// Quick badge count of unread messages for the current user.
router.get("/messages/unread-count", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const myVendor = await getMyVendor(userId);

  const whereClause = myVendor
    ? eq(conversationsTable.vendorId, myVendor.id)
    : eq(conversationsTable.shopperUserId, userId);

  const convRows = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(whereClause);

  if (convRows.length === 0) {
    res.json({ count: 0 });
    return;
  }

  const convIds = convRows.map((r) => r.id);
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(
      and(
        sql`${messagesTable.conversationId} = ANY(ARRAY[${sql.join(convIds.map((id) => sql`${id}`), sql`, `)}])`,
        isNull(messagesTable.readAt),
        sql`${messagesTable.senderUserId} != ${userId}`,
      ),
    );

  res.json({ count: result[0]?.count ?? 0 });
});

// GET /api/messages/conversations/:id
// Fetch all messages in a conversation (auth: must be participant).
router.get("/messages/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const convId = Number(req.params.id);
  const userId = (req as AuthRequest).userId;

  if (!Number.isInteger(convId) || convId <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const result = await assertParticipant(convId, userId);
  if (!result) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [shopper] = await db
    .select({ id: usersTable.id, username: usersTable.username, avatarSeed: usersTable.avatarSeed, avatarStyle: usersTable.avatarStyle })
    .from(usersTable)
    .where(eq(usersTable.id, result.conv.shopperUserId));

  const [vendor] = await db
    .select({ id: vendorsTable.id, name: vendorsTable.name, imageUrl: vendorsTable.imageUrl, slug: vendorsTable.slug, contactEmail: vendorsTable.contactEmail })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, result.conv.vendorId));

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(messagesTable.createdAt);

  res.json({ conversation: result.conv, shopper: shopper ?? null, vendor: vendor ?? null, messages });
});

// POST /api/messages/conversations/:id/messages { body }
// Send a message in a conversation (auth: must be participant).
router.post("/messages/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const convId = Number(req.params.id);
  const userId = (req as AuthRequest).userId;

  if (!Number.isInteger(convId) || convId <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = z
    .object({ body: z.string().trim().min(1).max(5000) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "body is required" });
    return;
  }

  const result = await assertParticipant(convId, userId);
  if (!result) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({ conversationId: convId, senderUserId: userId, body: parsed.data.body })
    .returning();

  // Bump conversation updatedAt for list ordering
  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, convId));

  res.status(201).json(msg);
});

// PATCH /api/messages/conversations/:id/read
// Mark all unread messages in a conversation (sent by the other party) as read.
router.patch("/messages/conversations/:id/read", requireAuth, async (req, res): Promise<void> => {
  const convId = Number(req.params.id);
  const userId = (req as AuthRequest).userId;

  if (!Number.isInteger(convId) || convId <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const result = await assertParticipant(convId, userId);
  if (!result) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messagesTable.conversationId, convId),
        isNull(messagesTable.readAt),
        sql`${messagesTable.senderUserId} != ${userId}`,
      ),
    );

  res.json({ ok: true });
});

export default router;
