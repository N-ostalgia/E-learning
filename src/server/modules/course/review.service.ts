// src/server/modules/course/review.service.ts
import { db } from "@/lib/db";
import { courseReviews, courses, users, courseEnrollments } from "@/lib/db/schema";
import { and, eq, desc, avg, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";

export async function getCourseReviews(courseId: string) {
  const reviews = await db
    .select({
      id: courseReviews.id,
      rating: courseReviews.rating,
      review: courseReviews.review,
      createdAt: courseReviews.createdAt,
      userName: users.name,
      userImage: users.image,
    })
    .from(courseReviews)
    .leftJoin(users, eq(users.id, courseReviews.userId))
    .where(eq(courseReviews.courseId, courseId))
    .orderBy(desc(courseReviews.createdAt));

  const stats = await db
    .select({
      averageRating: avg(courseReviews.rating),
      totalReviews: sql<number>`COUNT(*)`,
      count1: sql<number>`SUM(CASE WHEN ${courseReviews.rating} = 1 THEN 1 ELSE 0 END)`,
      count2: sql<number>`SUM(CASE WHEN ${courseReviews.rating} = 2 THEN 1 ELSE 0 END)`,
      count3: sql<number>`SUM(CASE WHEN ${courseReviews.rating} = 3 THEN 1 ELSE 0 END)`,
      count4: sql<number>`SUM(CASE WHEN ${courseReviews.rating} = 4 THEN 1 ELSE 0 END)`,
      count5: sql<number>`SUM(CASE WHEN ${courseReviews.rating} = 5 THEN 1 ELSE 0 END)`,
    })
    .from(courseReviews)
    .where(eq(courseReviews.courseId, courseId));

  return {
    reviews,
    stats: {
      averageRating: Number(stats[0]?.averageRating) || 0,
      totalReviews: Number(stats[0]?.totalReviews) || 0,
      distribution: {
        1: Number(stats[0]?.count1) || 0,
        2: Number(stats[0]?.count2) || 0,
        3: Number(stats[0]?.count3) || 0,
        4: Number(stats[0]?.count4) || 0,
        5: Number(stats[0]?.count5) || 0,
      },
    },
  };
}

export async function getUserReview(userId: string, courseId: string) {
  return db
    .select()
    .from(courseReviews)
    .where(
      and(
        eq(courseReviews.userId, userId),
        eq(courseReviews.courseId, courseId)
      )
    )
    .limit(1)
    .then((r) => r[0] || null);
}

export async function createReview(data: {
  userId: string;
  courseId: string;
  rating: number;
  review?: string;
}) {
  const course = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, data.courseId)).limit(1).then((r) => r[0]);
  if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });

  const enrollment = await db
    .select({ id: courseEnrollments.id })
    .from(courseEnrollments)
    .where(and(eq(courseEnrollments.userId, data.userId), eq(courseEnrollments.courseId, data.courseId)))
    .limit(1);
  if (enrollment.length === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You must be enrolled to review this course" });
  }

  const existing = await getUserReview(data.userId, data.courseId);
  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You have already reviewed this course",
    });
  }

  const now = new Date();
  const [review] = await db
    .insert(courseReviews)
    .values({
      id: randomUUID(),
      userId: data.userId,
      courseId: data.courseId,
      rating: data.rating,
      review: data.review || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return review;
}

export async function updateReview(userId: string, reviewId: string, data: { rating?: number; review?: string }) {
  const existing = await db.select({ userId: courseReviews.userId }).from(courseReviews).where(eq(courseReviews.id, reviewId)).limit(1).then((r) => r[0]);
  if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
  if (existing.userId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own review" });

  const [updated] = await db
    .update(courseReviews)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(courseReviews.id, reviewId))
    .returning();

  return updated;
}