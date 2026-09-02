// src/server/modules/notification/notification.service.ts
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { and, eq, desc, lt, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { publishNotification } from "@/lib/websocket";
import type {
  Notification,
  CreateNotificationInput,
  ListNotificationsInput,
  ListNotificationsResult,
} from "./notification.types";

// ---------- Helpers ----------

function toNotification(
  row: typeof notifications.$inferSelect & {
    actorId: string | null;
    actorName?: string | null;
    actorUsername?: string | null;
    actorImage?: string | null;
  }
): Notification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as Notification["type"],
    actorId: row.actorId,
    targetType: row.targetType as Notification["targetType"],
    targetId: row.targetId,
    message: row.message,
    link: row.link,
    isRead: Boolean(row.isRead),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    actor:
      row.actorId && row.actorName
        ? {
            id: row.actorId,
            name: row.actorName,
            username: row.actorUsername ?? "",
            image: row.actorImage ?? null,
          }
        : null,
  };
}

// ---------- Public API ----------

export async function createNotification(
  data: CreateNotificationInput
): Promise<Notification> {
  const now = new Date();
  const [row] = await db
    .insert(notifications)
    .values({
      id: randomUUID(),
      userId: data.userId,
      type: data.type,
      actorId: data.actorId ?? null,
      targetType: data.targetType ?? null,
      targetId: data.targetId ?? null,
      message: data.message,
      link: data.link,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const notification = toNotification(row);

  // Emit via WebSocket (best-effort — never block the caller if it fails).
  try {
    await publishNotification(data.userId, notification);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to publish notification via WebSocket:", error);
  }

  return notification;
}

export async function listNotifications(
  userId: string,
  options: ListNotificationsInput = {}
): Promise<ListNotificationsResult> {
  const limit = options.limit ?? 20;
  const cursor = options.cursor;
  const filter = options.filter ?? "all";

  const conditions: ReturnType<typeof and>[] = [eq(notifications.userId, userId)];

  if (filter === "unread") {
    conditions.push(eq(notifications.isRead, false));
  }

  if (cursor) {
    const cursorTime = new Date(Number(cursor));
    if (Number.isNaN(cursorTime.getTime())) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid notification cursor." });
    }
    conditions.push(lt(notifications.createdAt, cursorTime));
  }

  const rows = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      actorId: notifications.actorId,
      targetType: notifications.targetType,
      targetId: notifications.targetId,
      message: notifications.message,
      link: notifications.link,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      updatedAt: notifications.updatedAt,
      actorName: users.name,
      actorUsername: users.username,
      actorImage: users.image,
    })
    .from(notifications)
    .leftJoin(users, eq(users.id, notifications.actorId))
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];
  const nextCursor =
    hasMore && lastItem ? String(new Date(lastItem.createdAt).getTime()) : null;

  return {
    items: items.map((row) => toNotification(row)),
    nextCursor,
  };
}

export async function markAsRead(
  userId: string,
  notificationIds: string[]
): Promise<{ success: boolean }> {
  if (notificationIds.length === 0) return { success: true };

  await db
    .update(notifications)
    .set({ isRead: true, updatedAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        inArray(notifications.id, notificationIds)
      )
    );

  return { success: true };
}

export async function markAllAsRead(
  userId: string
): Promise<{ success: boolean }> {
  await db
    .update(notifications)
    .set({ isRead: true, updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return { success: true };
}

export async function getUnreadCount(
  userId: string
): Promise<{ count: number }> {
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .then((r) => r[0]);

  return { count: Number(rows?.count ?? 0) };
}

export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<{ success: boolean }> {
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    );

  return { success: true };
}
