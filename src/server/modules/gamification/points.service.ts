import { db } from "@/lib/db";
import { users, pointsActivity } from "@/lib/db/schema";
import { and, eq, sql, between } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getSettings } from "@/server/modules/admin/admin.service";

export type PointAction =
  | "post"
  | "comment"
  | "like_received"
  | "like_given"
  | "join_community"
  | "lesson_complete"
  | "quiz_pass"
  | "course_complete";

interface AwardPointsInput {
  userId: string;
  communityId: string;
  actionType: PointAction;
  targetId?: string;
  description?: string;
}

/**
 * Get the points value for a given action from the platform settings.
 */
async function getPointsForAction(action: PointAction): Promise<number> {
  const settings = await getSettings();
  switch (action) {
    case "post":
      return settings.pointsForPost ?? 10;
    case "comment":
      return settings.pointsForComment ?? 5;
    case "like_received":
      return settings.pointsForLikeReceived ?? 3;
    case "like_given":
      return 1; // fixed small reward for engagement
    case "join_community":
      return 3;
    case "lesson_complete":
      return settings.pointsForLessonComplete ?? 20;
    case "quiz_pass":
      return 10;
    case "course_complete":
      return 50;
    default:
      return 0;
  }
}

/**
 * Award points to a user based on the action type and update their total.
 */
export async function awardPoints(input: AwardPointsInput): Promise<void> {
  const { userId, communityId, actionType, targetId, description } = input;

  const settings = await getSettings();
  if (!settings.gamificationEnabled) return;

  const points = await getPointsForAction(actionType);
  if (points === 0) return;

  const now = new Date();

  // 1. Insert points activity record
  await db.insert(pointsActivity).values({
    id: randomUUID(),
    userId,
    communityId,
    points,
    actionType,
    targetId: targetId ?? null,
    description: description ?? null,
    createdAt: now,
  });

  // 2. Update user's total points (increment)
  await db
    .update(users)
    .set({
      points: sql`${users.points} + ${points}`,
      // Level up formula: level = floor(points / 100) + 1
      level: sql`CAST((${users.points} + ${points}) / 100 AS INTEGER) + 1`,
      updatedAt: now,
    })
    .where(eq(users.id, userId));
}

/**
 * Get user's total points in a community
 */
export async function getUserPointsInCommunity(
  userId: string,
  communityId: string
): Promise<number> {
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${pointsActivity.points}), 0)` })
    .from(pointsActivity)
    .where(
      and(
        eq(pointsActivity.userId, userId),
        eq(pointsActivity.communityId, communityId)
      )
    );
  return result[0]?.total ?? 0;
}

/**
 * Get user's points in a community for a specific time period
 */
export async function getUserPointsInCommunityPeriod(
  userId: string,
  communityId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${pointsActivity.points}), 0)` })
    .from(pointsActivity)
    .where(
      and(
        eq(pointsActivity.userId, userId),
        eq(pointsActivity.communityId, communityId),
        between(pointsActivity.createdAt, startDate, endDate)
      )
    );
  return result[0]?.total ?? 0;
}

/**
 * Get community leaderboard
 */
export async function getCommunityLeaderboard(
  communityId: string,
  timeRange: "all" | "week" | "month",
  limit: number = 10
): Promise<{
  rank: number;
  userId: string;
  username: string;
  name: string;
  avatar: string | null;
  points: number;
  level: number;
}[]> {
  let startDate: Date | null = null;
  const now = new Date();

  if (timeRange === "week") {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else if (timeRange === "month") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 1);
  }

  const query = db
    .select({
      userId: users.id,
      username: users.username,
      name: users.name,
      avatar: users.image,
      level: users.level,
      points: sql<number>`COALESCE(SUM(${pointsActivity.points}), 0)`,
    })
    .from(pointsActivity)
    .innerJoin(users, eq(users.id, pointsActivity.userId))
    .where(
      and(
        eq(pointsActivity.communityId, communityId),
        startDate ? between(pointsActivity.createdAt, startDate, now) : sql`1=1`
      )
    )
    .groupBy(pointsActivity.userId, users.id, users.username, users.name, users.image, users.level)
    .orderBy(sql`SUM(${pointsActivity.points}) DESC`)
    .limit(limit);

  const rows = await query;

  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    username: row.username,
    name: row.name,
    avatar: row.avatar,
    points: Number(row.points),
    level: row.level,
  }));
}