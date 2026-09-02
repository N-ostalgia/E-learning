import { db } from "@/lib/db";
import { events, communities, users } from "@/lib/db/schema";
import { and, eq, desc, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { checkMembership } from "@/server/modules/community/community.service";

export type EventWithCreator = typeof events.$inferSelect & {
  creator: { id: string; name: string; username: string; image: string | null };
};

export async function listEvents(
  communityId: string,
  startDate?: Date,
  endDate?: Date,
  currentUserId?: string
): Promise<EventWithCreator[]> {
  const community = await db.query.communities.findFirst({
    where: eq(communities.id, communityId),
  });
  if (!community) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Community not found" });
  }
  if (!community.isPublic && currentUserId) {
    const membership = await checkMembership(currentUserId, communityId);
    if (!membership.isMember) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be a member to view events",
      });
    }
  } else if (!community.isPublic && !currentUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This community is private",
    });
  }

  const conditions = [eq(events.communityId, communityId)];
  if (startDate) {
    conditions.push(gte(events.startDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(events.startDate, endDate));
  }

  const rows = await db
    .select({
      id: events.id,
      communityId: events.communityId,
      title: events.title,
      description: events.description,
      startDate: events.startDate,
      endDate: events.endDate,
      isFullDay: events.isFullDay,
      location: events.location,
      color: events.color,
      createdBy: events.createdBy,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      creatorId: events.createdBy,
      creatorName: users.name,
      creatorUsername: users.username,
      creatorImage: users.image,
    })
    .from(events)
    .leftJoin(users, eq(users.id, events.createdBy))
    .where(and(...conditions))
    .orderBy(desc(events.startDate));

  return rows.map((row) => ({
    id: row.id,
    communityId: row.communityId,
    title: row.title,
    description: row.description,
    startDate: row.startDate,
    endDate: row.endDate,
    isFullDay: row.isFullDay,
    location: row.location,
    color: row.color,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    creator: {
      id: row.creatorId,
      name: row.creatorName!, // non-null assertion, because name is not null in DB
      username: row.creatorUsername!, // non-null assertion
      image: row.creatorImage ?? null,
    },
  }));
}

export async function getEventById(eventId: string): Promise<EventWithCreator | null> {
  const row = await db
    .select({
      id: events.id,
      communityId: events.communityId,
      title: events.title,
      description: events.description,
      startDate: events.startDate,
      endDate: events.endDate,
      isFullDay: events.isFullDay,
      location: events.location,
      color: events.color,
      createdBy: events.createdBy,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      creatorId: events.createdBy,
      creatorName: users.name,
      creatorUsername: users.username,
      creatorImage: users.image,
    })
    .from(events)
    .leftJoin(users, eq(users.id, events.createdBy))
    .where(eq(events.id, eventId))
    .limit(1);

  if (!row || row.length === 0) return null;
  const r = row[0];
  return {
    id: r.id,
    communityId: r.communityId,
    title: r.title,
    description: r.description,
    startDate: r.startDate,
    endDate: r.endDate,
    isFullDay: r.isFullDay,
    location: r.location,
    color: r.color,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    creator: {
      id: r.creatorId,
      name: r.creatorName!,
      username: r.creatorUsername!,
      image: r.creatorImage ?? null,
    },
  };
}

export async function createEvent(
  userId: string,
  data: {
    communityId: string;
    title: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    isFullDay?: boolean;
    location?: string;
    color?: string;
  }
): Promise<EventWithCreator> {
  const membership = await checkMembership(userId, data.communityId);
  if (!membership.isMember) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You must be a member" });
  }
  if (!membership.isOwner && !membership.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only community owners and admins can create events",
    });
  }
  if (data.endDate && data.endDate < data.startDate) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Event end must be after its start" });
  }

  const now = new Date();
  const [event] = await db
    .insert(events)
    .values({
      id: randomUUID(),
      communityId: data.communityId,
      title: data.title,
      description: data.description ?? null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      isFullDay: data.isFullDay ?? false,
      location: data.location ?? null,
      color: data.color ?? "#10b981",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Use getEventById to get the full event with creator
  const created = await getEventById(event.id);
  if (!created) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve created event" });
  }
  return created;
}

export async function updateEvent(
  userId: string,
  eventId: string,
  data: {
    title?: string;
    description?: string | null;
    startDate?: Date;
    endDate?: Date | null;
    isFullDay?: boolean;
    location?: string | null;
    color?: string;
  }
): Promise<EventWithCreator> {
  const existing = await getEventById(eventId);
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  }

  const membership = await checkMembership(userId, existing.communityId);
  if (!membership.isOwner && !membership.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only community owners and admins can edit events",
    });
  }
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Event end must be after its start" });
  }

  const updateData: any = {
    updatedAt: new Date(),
  };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.startDate) updateData.startDate = data.startDate;
  if (data.endDate !== undefined) updateData.endDate = data.endDate;
  if (data.isFullDay !== undefined) updateData.isFullDay = data.isFullDay;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.color) updateData.color = data.color;

  await db.update(events).set(updateData).where(eq(events.id, eventId));

  const updated = await getEventById(eventId);
  if (!updated) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve updated event" });
  }
  return updated;
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  const existing = await getEventById(eventId);
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  }

  const membership = await checkMembership(userId, existing.communityId);
  if (!membership.isOwner && !membership.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only community owners and admins can delete events",
    });
  }

  await db.delete(events).where(eq(events.id, eventId));
}