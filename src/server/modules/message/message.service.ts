import { db } from "@/lib/db";
import { conversations, messages, users } from "@/lib/db/schema";
import { and, eq, desc, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import type { ConversationWithDetails, MessageWithSender, GetMessagesResult } from "./message.types";
import { isBlocked, unblockUser as unblockUserRecord } from "@/server/modules/user/user.service";

export async function getOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<string> {
  if (userId1 === userId2) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot message yourself" });
  }

  // Check if either user has blocked the other
  const blockedByUser2 = await isBlocked(userId2, userId1);
  const blockedByUser1 = await isBlocked(userId1, userId2);
  if (blockedByUser2 || blockedByUser1) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot message this user (blocked).",
    });
  }

  // Ensure both users exist
  const usersExist = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.id, userId1), eq(users.id, userId2)));
  if (usersExist.length < 2) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  // Check if conversation exists
  const existing = await db
    .select()
    .from(conversations)
    .where(
      or(
        and(eq(conversations.userId1, userId1), eq(conversations.userId2, userId2)),
        and(eq(conversations.userId1, userId2), eq(conversations.userId2, userId1))
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new conversation
  const now = new Date();
  const [conv] = await db
    .insert(conversations)
    .values({
      id: randomUUID(),
      userId1,
      userId2,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return conv.id;
}

export async function sendMessage(
  senderId: string,
  conversationId: string,
  content: string
): Promise<MessageWithSender> {
  // Verify conversation exists and sender is part of it
  const conv = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
  }

  if (conv[0].userId1 !== senderId && conv[0].userId2 !== senderId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not part of this conversation" });
  }

  // Determine the other user
  const otherUserId = conv[0].userId1 === senderId ? conv[0].userId2 : conv[0].userId1;

  // Check if either user has blocked the other
  const blockedByOther = await isBlocked(otherUserId, senderId);
  const blockedBySender = await isBlocked(senderId, otherUserId);
  if (blockedByOther || blockedBySender) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot send a message (blocked).",
    });
  }

  const now = new Date();
  const [msg] = await db
    .insert(messages)
    .values({
      id: randomUUID(),
      conversationId,
      senderId,
      content,
      isRead: false,
      readAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Update conversation's lastMessageAt
  await db
    .update(conversations)
    .set({ lastMessageAt: now, updatedAt: now })
    .where(eq(conversations.id, conversationId));

  // Fetch sender details
  const sender = await db.query.users.findFirst({
    where: eq(users.id, senderId),
    columns: { id: true, username: true, name: true, image: true },
  });

  return {
    ...msg,
    sender: {
      id: sender!.id,
      username: sender!.username,
      name: sender!.name,
      image: sender!.image,
    },
  };
}

export async function getConversations(userId: string): Promise<ConversationWithDetails[]> {
  const convs = await db
    .select()
    .from(conversations)
    .where(or(eq(conversations.userId1, userId), eq(conversations.userId2, userId)))
    .orderBy(desc(conversations.lastMessageAt));

  const result: ConversationWithDetails[] = [];
  for (const conv of convs) {
    const otherUserId = conv.userId1 === userId ? conv.userId2 : conv.userId1;
    const otherUser = await db.query.users.findFirst({
      where: eq(users.id, otherUserId),
      columns: { id: true, username: true, name: true, image: true },
    });
    if (!otherUser) continue;

    // Check if this user has blocked the other or vice versa
    const blockedByOther = await isBlocked(otherUserId, userId);
    const blockedByUser = await isBlocked(userId, otherUserId);
    const isConversationBlocked = blockedByOther || blockedByUser;

    // Get last message
    const lastMsg = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(desc(messages.createdAt))
      .limit(1)
      .then((rows) => rows[0] || null);

    // Count unread messages (where receiver is userId)
    const unreadCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conv.id),
          eq(messages.isRead, false),
          eq(messages.senderId, otherUserId)
        )
      )
      .then((r) => Number(r[0]?.count ?? 0));

    result.push({
      ...conv,
      otherUser: {
        id: otherUser.id,
        username: otherUser.username,
        name: otherUser.name,
        image: otherUser.image,
      },
      lastMessage: lastMsg,
      unreadCount,
      isBlocked: isConversationBlocked,
      // Direction, so the UI can tell "you blocked them" apart from
      // "they blocked you" instead of a single ambiguous flag.
      blockedByMe: blockedByUser,
    });
  }
  return result;
}

export async function getMessages(
  conversationId: string,
  userId: string,
  limit: number = 50,
  cursor?: string
): Promise<GetMessagesResult> {
  // Verify user is part of conversation
  const conv = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
  }
  if (conv[0].userId1 !== userId && conv[0].userId2 !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not part of this conversation" });
  }

  // Determine other user and block status
  const otherUserId = conv[0].userId1 === userId ? conv[0].userId2 : conv[0].userId1;
  const blockedByOther = await isBlocked(otherUserId, userId);
  const blockedByUser = await isBlocked(userId, otherUserId);
  const isConversationBlocked = blockedByOther || blockedByUser;

  // Always return messages even if blocked (they can see old conversations)
  const conditions = [eq(messages.conversationId, conversationId)];
  if (cursor) {
    conditions.push(sql`${messages.createdAt} < ${new Date(Number(cursor))}`);
  }

  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? String(last.createdAt.getTime()) : null;

  // Mark messages as read only if not blocked (optional)
  if (!isConversationBlocked) {
    await db
      .update(messages)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isRead, false),
          sql`${messages.senderId} != ${userId}`
        )
      );
  }

  // Fetch sender details
  const messagesWithSender: MessageWithSender[] = [];
  for (const msg of items) {
    const sender = await db.query.users.findFirst({
      where: eq(users.id, msg.senderId),
      columns: { id: true, username: true, name: true, image: true },
    });
    messagesWithSender.push({
      ...msg,
      sender: {
        id: sender!.id,
        username: sender!.username,
        name: sender!.name,
        image: sender!.image,
      },
    });
  }

  return {
    items: messagesWithSender,
    nextCursor,
    isBlocked: isConversationBlocked,
    blockedByMe: blockedByUser,
  };
}

export async function markAllRead(userId: string, conversationId: string): Promise<void> {
  await db
    .update(messages)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.isRead, false),
        sql`${messages.senderId} != ${userId}`
      )
    );
}


export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await unblockUserRecord(blockerId, blockedId);
}