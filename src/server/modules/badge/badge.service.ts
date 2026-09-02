// src/server/modules/badge/badge.service.ts

import { db } from "@/lib/db";
import {
  badges,
  userBadges,
  users,
  posts,
  comments,
  votes,
  courseEnrollments,
  communities,
} from "@/lib/db/schema";
import { and, eq, sql, count, desc, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BADGE_DEFINITIONS } from "@/lib/badges/definitions";
import { createNotification } from "@/server/modules/notification/notification.service";

// ---------- Types ----------
export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect & {
  badge: Badge;
};

// ---------- Auto-seeding ----------
let seedingInProgress = false;

async function ensureBadgesExist(): Promise<void> {
  if (seedingInProgress) return;
  seedingInProgress = true;
  try {
    const existing = await db.select().from(badges).limit(1);
    if (existing.length > 0) {
      seedingInProgress = false;
      return;
    }

    // Ensure definitions exist
    if (!BADGE_DEFINITIONS || BADGE_DEFINITIONS.length === 0) {
      console.warn("[badge] No badge definitions found, skipping seed.");
      seedingInProgress = false;
      return;
    }

    const now = new Date();
    // Explicitly map each definition to the schema fields.
    const inserts = BADGE_DEFINITIONS.map((def) => ({
      id: randomUUID(),
      name: def.name,
      description: def.description,
      icon: def.icon,
      color: def.color || "#10b981",
      requirementType: def.requirementType,
      requirementValue: def.requirementValue,
      isHidden: false,
      createdAt: now,
      updatedAt: now,
    }));

    // Now TypeScript knows the shape matches the schema.
    await db.insert(badges).values(inserts);
    console.log("[badge] Seeded badges successfully.");
  } catch (error) {
    console.error("[badge] Failed to seed badges:", error);
  } finally {
    seedingInProgress = false;
  }
}

// ---------- Public API ----------

/**
 * Get all badges – automatically seeds if empty.
 */
export async function getAllBadges(): Promise<Badge[]> {
  await ensureBadgesExist();
  return db.select().from(badges).orderBy(asc(badges.requirementValue), asc(badges.id));
}

/**
 * Get a user's earned badges (with badge details)
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const result = await db
    .select({
      id: userBadges.id,
      userId: userBadges.userId,
      badgeId: userBadges.badgeId,
      earnedAt: userBadges.earnedAt,
      createdAt: userBadges.createdAt,
      badge: badges,
    })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(eq(userBadges.userId, userId))
    .orderBy(desc(userBadges.earnedAt));

  return result.map((row) => ({
    id: row.id,
    userId: row.userId,
    badgeId: row.badgeId,
    earnedAt: row.earnedAt,
    createdAt: row.createdAt,
    badge: row.badge,
  }));
}

/**
 * Check and award badges for a user based on their activity stats.
 * Should be called after any relevant action (post, comment, like, course complete, etc.)
 * Returns the newly earned badges.
 */
export async function checkAndAwardBadges(userId: string): Promise<Badge[]> {
  // 1. Get user's current stats
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      points: true,
      username: true,
    },
  });
  if (!user) return [];

  // Count posts
  const postCount = await db
    .select({ count: count() })
    .from(posts)
    .where(eq(posts.authorId, userId))
    .then((r) => Number(r[0]?.count ?? 0));

  // Count comments
  const commentCount = await db
    .select({ count: count() })
    .from(comments)
    .where(eq(comments.authorId, userId))
    .then((r) => Number(r[0]?.count ?? 0));

  // Count likes received (votes on user's posts)
  const postLikes = await db
    .select({ count: count() })
    .from(votes)
    .innerJoin(posts, eq(posts.id, votes.targetId))
    .where(
      and(
        eq(posts.authorId, userId),
        eq(votes.targetType, "post")
      )
    )
    .then((r) => Number(r[0]?.count ?? 0));

  // Count likes on comments
  const commentLikes = await db
    .select({ count: count() })
    .from(votes)
    .innerJoin(comments, eq(comments.id, votes.targetId))
    .where(
      and(
        eq(comments.authorId, userId),
        eq(votes.targetType, "comment")
      )
    )
    .then((r) => Number(r[0]?.count ?? 0));

  const totalLikesReceived = postLikes + commentLikes;

  // Count courses completed
  const coursesCompleted = await db
    .select({ count: count() })
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, userId),
        eq(courseEnrollments.progress, 100)
      )
    )
    .then((r) => Number(r[0]?.count ?? 0));

  // Count communities created
  const communitiesCreated = await db
    .select({ count: count() })
    .from(communities)
    .where(eq(communities.ownerId, userId))
    .then((r) => Number(r[0]?.count ?? 0));

  // 2. Get all badges
  const allBadges = await getAllBadges();

  // 3. Get already earned badge IDs
  const earned = await db
    .select({ badgeId: userBadges.badgeId })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));
  const earnedIds = new Set(earned.map((e) => e.badgeId));

  // 4. Check each badge
  const newlyEarned: Badge[] = [];
  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;

    let qualified = false;
    switch (badge.requirementType) {
      case "posts":
        qualified = postCount >= badge.requirementValue;
        break;
      case "comments":
        qualified = commentCount >= badge.requirementValue;
        break;
      case "likes_received":
        qualified = totalLikesReceived >= badge.requirementValue;
        break;
      case "courses_completed":
        qualified = coursesCompleted >= badge.requirementValue;
        break;
      case "points":
        qualified = user.points >= badge.requirementValue;
        break;
      case "communities_created":
        qualified = communitiesCreated >= badge.requirementValue;
        break;
      default:
        continue;
    }

    if (qualified) {
      // Award badge
      const now = new Date();
      const [earnedBadge] = await db.insert(userBadges).values({
        id: randomUUID(),
        userId,
        badgeId: badge.id,
        earnedAt: now,
        createdAt: now,
      }).onConflictDoNothing({ target: [userBadges.userId, userBadges.badgeId] }).returning({ id: userBadges.id });
      if (!earnedBadge) continue;
      newlyEarned.push(badge);

      // Create notification for the badge (actorId is optional, so we omit it)
      try {
        await createNotification({
          userId,
          type: "badge", // Make sure 'badge' is in the NotificationType union
          targetType: "badge",
          targetId: badge.id,
          message: `🎖️ You earned the "${badge.name}" badge!`,
          link: `/profile/${user.username}`,
        });
      } catch (error) {
        console.error("Failed to create badge notification:", error);
      }
    }
  }

  return newlyEarned;
}

/**
 * Get a badge by ID
 */
export async function getBadgeById(badgeId: string): Promise<Badge | null> {
  await ensureBadgesExist();
  const result = await db
    .select()
    .from(badges)
    .where(eq(badges.id, badgeId))
    .limit(1);
  return result[0] ?? null;
}