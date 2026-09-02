// src/server/modules/profile/profile.service.ts
import { db } from "@/lib/db";
import {
  users,
  posts,
  comments,
  communities,
  communityMembers,
  subscriptions,
  notifications,
  reports,
  votes,
  bookmarks,
  mentions,
  courseEnrollments,
  lessonProgress,
  quizAttempts,
  pointsActivity,
  userBadges,
} from "@/lib/db/schema";
import { and, eq, desc, lt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import type {
  UserProfile,
  UpdateProfileInput,
  UserActivity,
  UserCommunity,
  UserStats,
} from "./profile.types";
import { deleteFile } from "@/lib/r2";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-06-24.dahlia",
});

function toUserProfile(row: {
  id: string;
  email: string;
  username: string;
  name: string;
  image: string | null;
  imageKey: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  github: string | null;
  twitter: string | null;
  linkedin: string | null;
  createdAt: Date;
  points: number;
  level: number;
  postCount: number;
  commentCount: number;
  communityCount: number;
}): UserProfile {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    image: row.image,
    imageKey: row.imageKey,
    bio: row.bio,
    website: row.website,
    location: row.location,
    github: row.github,
    twitter: row.twitter,
    linkedin: row.linkedin,
    createdAt: new Date(row.createdAt),
    points: Number(row.points ?? 0),
    level: Number(row.level ?? 1),
    postCount: Number(row.postCount),
    commentCount: Number(row.commentCount),
    communityCount: Number(row.communityCount),
  };
}

async function queryProfileByField(
  field: "id" | "username",
  value: string
): Promise<UserProfile | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      name: users.name,
      image: users.image,
      imageKey: users.imageKey,
      bio: users.bio,
      website: users.website,
      location: users.location,
      github: users.github,
      twitter: users.twitter,
      linkedin: users.linkedin,
      createdAt: users.createdAt,
      points: users.points,
      level: users.level,
      postCount: sql<number>`
        (SELECT COUNT(*) FROM posts WHERE posts.author_id = users.id)
      `,
      commentCount: sql<number>`
        (SELECT COUNT(*) FROM comments WHERE comments.author_id = users.id AND comments.is_deleted = 0)
      `,
      communityCount: sql<number>`
        (SELECT COUNT(*) FROM community_members WHERE community_members.user_id = users.id AND community_members.status = 'active')
      `,
    })
    .from(users)
    .where(field === "id" ? eq(users.id, value) : eq(users.username, value))
    .limit(1);

  if (rows.length === 0) return null;
  return toUserProfile(rows[0]);
}

export async function getProfileByUsername(
  username: string
): Promise<UserProfile | null> {
  const profile = await queryProfileByField("username", username);
  if (!profile) return null;
  const { email: _email, ...publicProfile } = profile;
  return publicProfile;
}

export async function getProfileById(
  userId: string
): Promise<UserProfile | null> {
  return queryProfileByField("id", userId);
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<UserProfile> {
  const existing = await db
    .select({ id: users.id, imageKey: users.imageKey })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  }

  const updateData: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.avatarUrl && data.avatarKey) {
    const oldKey = existing[0].imageKey;
    if (oldKey) {
      try {
        await deleteFile(oldKey);
      } catch (err) {
        console.error("Failed to delete old avatar from R2:", err);
      }
    }
    updateData.image = data.avatarUrl;
    updateData.imageKey = data.avatarKey;
  } else if (data.avatarUrl === null && data.avatarKey === null) {
    updateData.image = null;
    updateData.imageKey = null;
  }

  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.website !== undefined) updateData.website = data.website;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.github !== undefined) updateData.github = data.github;
  if (data.twitter !== undefined) updateData.twitter = data.twitter;
  if (data.linkedin !== undefined) updateData.linkedin = data.linkedin;

  await db.update(users).set(updateData).where(eq(users.id, userId));

  const updated = await getProfileById(userId);
  if (!updated) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  }
  return updated;
}

export async function getUserActivity(
  userId: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<{ items: UserActivity[]; nextCursor: string | null }> {
  const limit = options.limit ?? 20;
  const cursor = options.cursor;

  const userExists = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (userExists.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  }

  const cursorTime = cursor ? new Date(Number(cursor)) : null;
  const postConditions = [eq(posts.authorId, userId)];
  const commentConditions = [
    eq(comments.authorId, userId),
    eq(comments.isDeleted, false),
  ];

  if (cursorTime) {
    if (Number.isNaN(cursorTime.getTime())) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid activity cursor." });
    }
    postConditions.push(lt(posts.createdAt, cursorTime));
    commentConditions.push(lt(comments.createdAt, cursorTime));
  }

  const postRows = await db
    .select({
      id: posts.id,
      content: posts.content,
      communityName: communities.name,
      communitySlug: communities.slug,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(communities, eq(communities.id, posts.communityId))
    .where(and(...postConditions, eq(communities.isPublic, true)))
    .orderBy(desc(posts.createdAt))
    .limit(limit + 1);

  const commentRows = await db
    .select({
      id: comments.id,
      content: comments.content,
      communityName: communities.name,
      communitySlug: communities.slug,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .innerJoin(communities, eq(communities.id, posts.communityId))
    .where(and(...commentConditions, eq(communities.isPublic, true)))
    .orderBy(desc(comments.createdAt))
    .limit(limit + 1);

  const postsMapped: UserActivity[] = postRows.map((row) => ({
    id: row.id,
    type: "post",
    content: row.content,
    communityName: row.communityName,
    communitySlug: row.communitySlug,
    createdAt: new Date(row.createdAt),
  }));

  const commentsMapped: UserActivity[] = commentRows.map((row) => ({
    id: row.id,
    type: "comment",
    content: row.content,
    communityName: row.communityName,
    communitySlug: row.communitySlug,
    createdAt: new Date(row.createdAt),
  }));

  const merged = [...postsMapped, ...commentsMapped]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);

  const hasMore = merged.length === limit;
  const lastItem = merged[merged.length - 1];
  const nextCursor =
    hasMore && lastItem ? String(lastItem.createdAt.getTime()) : null;

  return { items: merged, nextCursor };
}

export async function getUserCommunities(
  userId: string
): Promise<UserCommunity[]> {
  const rows = await db
    .select({
      id: communities.id,
      name: communities.name,
      slug: communities.slug,
      description: communities.description,
      avatarUrl: communities.avatarUrl,
      isPublic: communities.isPublic,
      memberCount: sql<number>`
        (SELECT COUNT(*) FROM community_members cm2
         WHERE cm2.community_id = communities.id
         AND cm2.status = 'active')
      `,
      role: communityMembers.role,
      joinedAt: communityMembers.joinedAt,
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communityMembers.communityId, communities.id))
    .where(
      and(
        eq(communityMembers.userId, userId),
        eq(communityMembers.status, "active"),
        eq(communities.isPublic, true)
      )
    )
    .orderBy(desc(communityMembers.joinedAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    avatarUrl: row.avatarUrl,
    isPublic: row.isPublic,
    memberCount: Number(row.memberCount),
    role: row.role,
    joinedAt: new Date(row.joinedAt),
  }));
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const user = await db
    .select({
      points: users.points,
      level: users.level,
      postCount: sql<number>`
        (SELECT COUNT(*) FROM posts WHERE posts.author_id = users.id)
      `,
      commentCount: sql<number>`
        (SELECT COUNT(*) FROM comments WHERE comments.author_id = users.id AND comments.is_deleted = 0)
      `,
      communityCount: sql<number>`
        (SELECT COUNT(*) FROM community_members WHERE community_members.user_id = users.id AND community_members.status = 'active')
      `,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  }

  return {
    postCount: Number(user.postCount),
    commentCount: Number(user.commentCount),
    communityCount: Number(user.communityCount),
    points: Number(user.points ?? 0),
    level: Number(user.level ?? 1),
  };
}

export async function deleteAccount(userId: string): Promise<{ success: boolean }> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  // Cancel all active subscriptions
  const activeSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active")
      )
    );

  for (const sub of activeSubscriptions) {
    if (sub.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
        console.log(`Canceled Stripe subscription: ${sub.stripeSubscriptionId}`);
      } catch (err) {
        console.error("Failed to cancel Stripe subscription:", err);
      }
    }
  }

  if (activeSubscriptions.length > 0) {
    await db
      .update(subscriptions)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId));
  }

  // Delete all related data
  await db.delete(communityMembers).where(eq(communityMembers.userId, userId));
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(reports).where(eq(reports.reporterId, userId));
  await db.delete(bookmarks).where(eq(bookmarks.userId, userId));
  await db.delete(mentions).where(eq(mentions.userId, userId));
  await db.delete(courseEnrollments).where(eq(courseEnrollments.userId, userId));
  await db.delete(lessonProgress).where(eq(lessonProgress.userId, userId));
  await db.delete(quizAttempts).where(eq(quizAttempts.userId, userId));
  await db.delete(pointsActivity).where(eq(pointsActivity.userId, userId));
  await db.delete(userBadges).where(eq(userBadges.userId, userId));
  await db.delete(votes).where(eq(votes.userId, userId));
  await db.delete(comments).where(eq(comments.authorId, userId));
  await db.delete(posts).where(eq(posts.authorId, userId));

  // Delete avatar from R2 if exists
  if (user.imageKey) {
    try {
      await deleteFile(user.imageKey);
    } catch (err) {
      console.error("Failed to delete avatar from R2:", err);
    }
  }

  // Finally delete the user
  await db.delete(users).where(eq(users.id, userId));

  return { success: true };
}