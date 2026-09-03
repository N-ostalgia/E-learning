// src/server/modules/course/course.service.ts
import { db } from "@/lib/db";
import {
  courses,
  lessons,
  courseEnrollments,
  lessonProgress,
  communities,
  communityMembers,
   quizzes,      
  quizQuestions,  
} from "@/lib/db/schema";
import { and, eq, inArray, desc, asc, sql, getTableColumns } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { deleteFile } from "@/lib/r2";
import { checkAndAwardBadges } from "@/server/modules/badge/badge.service";
import type { LessonProgress } from "./course.types";

// Get all columns from courses table
const courseColumns = getTableColumns(courses);

// ============================
// COURSE CRUD
// ============================

export async function getCourse(courseId: string, userId?: string) {
  const course = await db
    .select({
      ...courseColumns,
      lessonCount: sql<number>`(SELECT COUNT(*) FROM lessons WHERE lessons.course_id = courses.id)`,
      isEnrolled: userId
    ? sql<boolean>`EXISTS (SELECT 1 FROM course_enrollments WHERE course_enrollments.course_id = courses.id AND course_enrollments.user_id = ${userId})`
        : sql<boolean>`0`,
      progress: userId
        ? sql<number>`(
            SELECT COALESCE(ROUND((SUM(CASE WHEN lesson_progress.completed = 1 THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(lessons.id), 0)), 0)
            FROM lessons
            LEFT JOIN lesson_progress ON lesson_progress.lesson_id = lessons.id AND lesson_progress.user_id = ${userId}
            WHERE lessons.course_id = courses.id
          )`
        : sql<number>`0`,
    })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)
    .then((r) => r[0]);

  if (!course) return null;

  const community = await db
    .select({ ownerId: communities.ownerId })
    .from(communities)
    .where(eq(communities.id, course.communityId))
    .limit(1)
    .then((r) => r[0]);

  const isOwner = community?.ownerId === userId;

  const communityVisibility = await db
    .select({ isPublic: communities.isPublic })
    .from(communities)
    .where(eq(communities.id, course.communityId))
    .limit(1)
    .then((r) => r[0]);
  if (!communityVisibility?.isPublic && !isOwner) {
    if (!userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Community membership required" });
    }
    const membership = await db
      .select({ id: communityMembers.id })
      .from(communityMembers)
      .where(and(
        eq(communityMembers.userId, userId),
        eq(communityMembers.communityId, course.communityId),
        eq(communityMembers.status, "active")
      ))
      .limit(1);
    if (membership.length === 0) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Community membership required" });
    }
  }

  // Only owner can see unpublished courses
  if (course.isPublished !== true && !isOwner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This course is not published",
    });
  }

  // Check if user has access to this course
  if (userId && !isOwner && !course.isEnrolled && course.price && course.price > 0) {
    const isMember = await db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.userId, userId),
          eq(communityMembers.communityId, course.communityId),
          eq(communityMembers.status, "active")
        )
      )
      .limit(1)
      .then((r) => r.length > 0);

    if (!isMember) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be a member of this community to view this course",
      });
    }
  }

  return {
    ...course,
    isOwner: isOwner || false,
  };
}
export async function canAccessLessonContent(userId: string, lessonId: string) {
  const lesson = await db
  .select({ courseId: lessons.courseId, communityId: courses.communityId, ownerId: communities.ownerId })
  .from(lessons)
  .innerJoin(courses, eq(courses.id, lessons.courseId))
  .innerJoin(communities, eq(communities.id, courses.communityId))
  .where(eq(lessons.id, lessonId))
  .limit(1)
  .then((rows) => rows[0]);

  if (!lesson) return false;
  if (lesson.ownerId === userId) return true;

  const membership = await db
  .select({ id: communityMembers.id, role: communityMembers.role })
  .from(communityMembers)
  .where(
    and(
    eq(communityMembers.userId, userId),
    eq(communityMembers.communityId, lesson.communityId),
    eq(communityMembers.status, "active")
    )
  )
  .limit(1)
  .then((rows) => rows[0]);

  if (membership?.role === "admin") return true;

  const enrollment = await db
  .select({ id: courseEnrollments.id })
  .from(courseEnrollments)
  .where(
    and(
    eq(courseEnrollments.userId, userId),
    eq(courseEnrollments.courseId, lesson.courseId)
    )
  )
  .limit(1);

  return enrollment.length > 0;
}

export async function getCourseWithLessons(courseId: string, userId?: string) {
  const course = await getCourse(courseId, userId);
  if (!course) return null;

  // Get the community to check ownership
  const community = await db
    .select({ ownerId: communities.ownerId })
    .from(communities)
    .where(eq(communities.id, course.communityId))
    .limit(1)
    .then((r) => r[0]);

  const isOwner = community?.ownerId === userId;

  // Build the where condition properly
  let whereCondition;
  if (isOwner) {
    // Owner sees all lessons (including drafts)
    whereCondition = eq(lessons.courseId, courseId);
  } else {
    // Non-owners only see published lessons
    whereCondition = and(
      eq(lessons.courseId, courseId),
      eq(lessons.isPublished, true)
    );
  }

  const allLessons = await db
    .select()
    .from(lessons)
    .where(whereCondition)
    .orderBy(asc(lessons.order));

  const lessonProgressMap: Record<string, LessonProgress> = {};
  const lessonIds = allLessons.map((lesson) => lesson.id);
  if (userId && lessonIds.length > 0) {
    const progress = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          inArray(lessonProgress.lessonId, lessonIds)
        )
      );
    for (const item of progress) lessonProgressMap[item.lessonId] = item;
  }

  const lessonsWithProgress = allLessons.map((lesson) => ({
    ...(!isOwner && course.price && course.price > 0 && !course.isEnrolled && !lesson.isFree
      ? { ...lesson, content: null, videoUrl: null, videoKey: null, thumbnailUrl: null, thumbnailKey: null }
      : lesson),
    progress: lessonProgressMap[lesson.id] || null,
    isCompleted: lessonProgressMap[lesson.id]?.completed || false,
    videoCompleted: lessonProgressMap[lesson.id]?.videoCompleted || false,
  }));

  return {
    ...course,
    lessons: lessonsWithProgress,
    completedLessonCount: lessonsWithProgress.filter((l) => l.isCompleted).length,
  };
}
export async function listCourses(
  communityId: string,
  userId?: string,
  options: { search?: string; filter?: "all" | "free" | "paid" } = {}
) {
  // Check if user is the community owner
  let isOwner = false;
  if (userId) {
    const community = await db
      .select()
      .from(communities)
      .where(and(eq(communities.id, communityId), eq(communities.ownerId, userId)))
      .limit(1)
      .then((r) => r[0]);
    isOwner = !!community;
  }

  const conditions = [eq(courses.communityId, communityId)];

  const community = await db
    .select({ isPublic: communities.isPublic })
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1)
    .then((r) => r[0]);
  if (!community) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Community not found" });
  }
  if (!community.isPublic && !isOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Community membership required" });
  }

  // If user is NOT the owner, only show published courses
  // If user IS the owner, show ALL courses (drafts + published)
  if (!isOwner) {
    conditions.push(eq(courses.isPublished, true));
  }

  if (options.search) conditions.push(sql`LOWER(${courses.title}) LIKE LOWER(${`%${options.search}%`})`);
  if (options.filter === "free") conditions.push(eq(courses.price, 0));
  if (options.filter === "paid") conditions.push(sql`${courses.price} > 0`);

  const allCourses = await db
    .select({
      ...courseColumns,
      lessonCount: sql<number>`(SELECT COUNT(*) FROM lessons WHERE lessons.course_id = courses.id)`,
      isEnrolled: userId
        ? sql<boolean>`EXISTS (SELECT 1 FROM course_enrollments WHERE course_enrollments.course_id = courses.id AND course_enrollments.user_id = ${userId})`
        : sql<boolean>`0`,
      progress: userId
        ? sql<number>`(
            SELECT COALESCE(ROUND((SUM(CASE WHEN lesson_progress.completed = 1 THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(lessons.id), 0)), 0)
            FROM lessons
            LEFT JOIN lesson_progress ON lesson_progress.lesson_id = lessons.id AND lesson_progress.user_id = ${userId}
            WHERE lessons.course_id = courses.id
          )`
        : sql<number>`0`,
    })
    .from(courses)
    .where(and(...conditions))
    .orderBy(asc(courses.sortOrder), desc(courses.createdAt));

  return allCourses;
}

export async function createCourse(data: {
  userId: string;
  communityId: string;
  title: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  imageKey?: string;
  isPublished?: boolean;
  sortOrder?: number;
}) {
  // Verify user owns the community
  const community = await db
    .select()
    .from(communities)
    .where(and(eq(communities.id, data.communityId), eq(communities.ownerId, data.userId)))
    .limit(1)
    .then((r) => r[0]);

  if (!community) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be the community owner to create courses",
    });
  }

  const now = new Date();
  const [course] = await db
    .insert(courses)
    .values({
      id: randomUUID(),
      communityId: data.communityId,
      title: data.title,
      description: data.description || null,
      price: data.price || 0,
      imageUrl: data.imageUrl || null,
      imageKey: data.imageKey || null,
      isPublished: data.isPublished ?? false,
      sortOrder: data.sortOrder || 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return course;
}

export async function updateCourse(
  courseId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    imageKey?: string;
    isPublished?: boolean;
    sortOrder?: number;
  }
) {
  const course = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)
    .then((r) => r[0]);

  if (!course) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
  }

  const community = await db
    .select()
    .from(communities)
    .where(and(eq(communities.id, course.communityId), eq(communities.ownerId, userId)))
    .limit(1)
    .then((r) => r[0]);

  if (!community) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the community owner can update this course",
    });
  }

  const [updated] = await db
    .update(courses)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, courseId))
    .returning();

  return updated;
}

export async function deleteCourse(courseId: string, userId: string) {
  const course = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)
    .then((r) => r[0]);

  if (!course) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
  }

  const community = await db
    .select()
    .from(communities)
    .where(and(eq(communities.id, course.communityId), eq(communities.ownerId, userId)))
    .limit(1)
    .then((r) => r[0]);

  if (!community) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the community owner can delete this course",
    });
  }

  // Delete R2 files
  if (course.imageKey) {
    try {
      await deleteFile(course.imageKey);
    } catch (err) {
      console.error("Failed to delete course image from R2:", err);
    }
  }

  // Get all lessons and delete their files
  const courseLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, courseId));

  for (const lesson of courseLessons) {
    if (lesson.videoKey) {
      try {
        await deleteFile(lesson.videoKey);
      } catch (err) {
        console.error("Failed to delete lesson video from R2:", err);
      }
    }
    if (lesson.thumbnailKey) {
      try {
        await deleteFile(lesson.thumbnailKey);
      } catch (err) {
        console.error("Failed to delete lesson thumbnail from R2:", err);
      }
    }
  }

  // Delete all lessons and enrollment
  await db.delete(lessons).where(eq(lessons.courseId, courseId));
  await db.delete(courseEnrollments).where(eq(courseEnrollments.courseId, courseId));
  await db.delete(courses).where(eq(courses.id, courseId));

  return { success: true };
}

// ============================
// LESSON CRUD
// ============================

export async function createLesson(data: {
  userId: string;
  courseId: string;
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  videoKey?: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  duration?: number;
  isFree?: boolean;
  isPublished?: boolean;
}) {
  const course = await db
    .select()
    .from(courses)
    .where(eq(courses.id, data.courseId))
    .limit(1)
    .then((r) => r[0]);

  if (!course) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
  }

  const community = await db
    .select()
    .from(communities)
    .where(and(eq(communities.id, course.communityId), eq(communities.ownerId, data.userId)))
    .limit(1)
    .then((r) => r[0]);

  if (!community) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the community owner can add lessons",
    });
  }

  // Get max order
  const maxOrder = await db
    .select({ max: sql<number>`MAX(${lessons.order})` })
    .from(lessons)
    .where(eq(lessons.courseId, data.courseId))
    .then((r) => r[0]?.max || 0);

  const now = new Date();
  const [lesson] = await db
    .insert(lessons)
    .values({
      id: randomUUID(),
      courseId: data.courseId,
      title: data.title,
      description: data.description || null,
      content: data.content || null,
      videoUrl: data.videoUrl || null,
      videoKey: data.videoKey || null,
      thumbnailUrl: data.thumbnailUrl || null,
      thumbnailKey: data.thumbnailKey || null,
      duration: data.duration || 0,
      order: maxOrder + 1,
      isFree: data.isFree ?? false,
      isPublished: data.isPublished ?? true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return lesson;
}

export async function updateLesson(
  lessonId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    content?: string;
    videoUrl?: string;
    videoKey?: string;
    thumbnailUrl?: string;
    thumbnailKey?: string;
    duration?: number;
    isFree?: boolean;
    isPublished?: boolean;
  }
) {
  const lesson = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1)
    .then((r) => r[0]);

  if (!lesson) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
  }

  const course = await db
    .select()
    .from(courses)
    .where(eq(courses.id, lesson.courseId))
    .limit(1)
    .then((r) => r[0]);

  const community = await db
    .select()
    .from(communities)
    .where(and(eq(communities.id, course.communityId), eq(communities.ownerId, userId)))
    .limit(1)
    .then((r) => r[0]);

  if (!community) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the community owner can update lessons",
    });
  }

  const [updated] = await db
    .update(lessons)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, lessonId))
    .returning();

  return updated;
}

export async function deleteLesson(lessonId: string, userId: string) {
  const lesson = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1)
    .then((r) => r[0]);

  if (!lesson) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
  }

  const course = await db
    .select()
    .from(courses)
    .where(eq(courses.id, lesson.courseId))
    .limit(1)
    .then((r) => r[0]);

  const community = await db
    .select()
    .from(communities)
    .where(and(eq(communities.id, course.communityId), eq(communities.ownerId, userId)))
    .limit(1)
    .then((r) => r[0]);

  if (!community) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the community owner can delete lessons",
    });
  }

  //  Check if there's a quiz for this lesson and delete it first
  const quiz = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.lessonId, lessonId))
    .limit(1)
    .then((r) => r[0]);

  if (quiz) {
    // Delete quiz questions first
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quiz.id));
    // Delete quiz
    await db.delete(quizzes).where(eq(quizzes.id, quiz.id));
  }

  // Delete R2 files
  if (lesson.videoKey) {
    try {
      await deleteFile(lesson.videoKey);
    } catch (err) {
      console.error("Failed to delete video from R2:", err);
    }
  }
  if (lesson.thumbnailKey) {
    try {
      await deleteFile(lesson.thumbnailKey);
    } catch (err) {
      console.error("Failed to delete thumbnail from R2:", err);
    }
  }

  // Delete lesson progress records
  await db.delete(lessonProgress).where(eq(lessonProgress.lessonId, lessonId));

  // Delete the lesson
  await db.delete(lessons).where(eq(lessons.id, lessonId));

  // Reorder remaining lessons
  const remainingLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, lesson.courseId))
    .orderBy(asc(lessons.order));

  for (let i = 0; i < remainingLessons.length; i++) {
    await db
      .update(lessons)
      .set({ order: i + 1 })
      .where(eq(lessons.id, remainingLessons[i].id));
  }

  return { success: true };
}
export async function reorderLessons(courseId: string, userId: string, lessonIds: string[]) {
  const course = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)
    .then((r) => r[0]);

  if (!course) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
  }

  const community = await db
    .select()
    .from(communities)
    .where(and(eq(communities.id, course.communityId), eq(communities.ownerId, userId)))
    .limit(1)
    .then((r) => r[0]);

  if (!community) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the community owner can reorder lessons",
    });
  }

  if (new Set(lessonIds).size !== lessonIds.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Lesson IDs must be unique" });
  }

  const courseLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.courseId, courseId));
  const courseLessonIds = new Set(courseLessons.map((lesson) => lesson.id));
  if (lessonIds.length !== courseLessonIds.size || lessonIds.some((id) => !courseLessonIds.has(id))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The reorder list must contain every lesson in this course exactly once",
    });
  }

  const now = new Date();
  const orderCase = sql.join(
    lessonIds.map((lessonId, index) => sql`WHEN ${lessons.id} = ${lessonId} THEN ${index + 1}`),
    sql.raw(" ")
  );
  await db
    .update(lessons)
    .set({ order: sql`CASE ${orderCase} ELSE ${lessons.order} END`, updatedAt: now })
    .where(and(eq(lessons.courseId, courseId), inArray(lessons.id, lessonIds)));

  return { success: true };
}

// ============================
// ENROLLMENT & PROGRESS
// ============================

export async function enrollInCourse(userId: string, courseId: string) {
  const course = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)
    .then((r) => r[0]);

  if (!course) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
  }

  // Check if user is a member of the community
  const isMember = await db
    .select()
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.userId, userId),
        eq(communityMembers.communityId, course.communityId),
        eq(communityMembers.status, "active")
      )
    )
    .limit(1)
    .then((r) => r.length > 0);

  if (!isMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a member of this community to enroll in courses",
    });
  }

  // Check if already enrolled
  const existing = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, userId),
        eq(courseEnrollments.courseId, courseId)
      )
    )
    .limit(1)
    .then((r) => r[0]);

  if (existing) {
    return existing;
  }

  if (course.price && course.price > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This paid course requires checkout before enrollment",
    });
  }

  const now = new Date();
  const [enrollment] = await db
    .insert(courseEnrollments)
    .values({
      id: randomUUID(),
      userId,
      courseId,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return enrollment;
}

export async function grantPaidCourseEnrollment(userId: string, courseId: string) {
  const course = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)
    .then((r) => r[0]);

  if (!course || !course.price || course.price <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Course is not a paid course" });
  }

  const isMember = await db
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.userId, userId),
        eq(communityMembers.communityId, course.communityId),
        eq(communityMembers.status, "active")
      )
    )
    .limit(1);

  if (!isMember.length) {
    throw new TRPCError({ code: "FORBIDDEN", message: "User is not a community member" });
  }

  const existing = await getEnrollment(userId, courseId);
  if (existing) return existing;

  const now = new Date();
  const [enrollment] = await db
    .insert(courseEnrollments)
    .values({ id: randomUUID(), userId, courseId, progress: 0, createdAt: now, updatedAt: now })
    .returning();
  return enrollment;
}

export async function getEnrollment(userId: string, courseId: string) {
  return db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, userId),
        eq(courseEnrollments.courseId, courseId)
      )
    )
    .limit(1)
    .then((r) => r[0] || null);
}

export async function markLessonComplete(userId: string, lessonId: string) {
  const lesson = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1)
    .then((r) => r[0]);

  if (!lesson) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
  }

  // Check enrollment
  const enrollment = await getEnrollment(userId, lesson.courseId);
  if (!enrollment) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be enrolled in this course",
    });
  }

  const existing = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)))
    .limit(1)
    .then((r) => r[0]);

  const videoComplete =
    existing?.videoCompleted === true || (existing?.videoWatchedPercent ?? 0) >= 80;
  if (!videoComplete) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Watch at least 80% of the lesson video before completing this lesson",
    });
  }

  const quiz = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(eq(quizzes.lessonId, lessonId))
    .limit(1)
    .then((r) => r[0]);

  if (quiz && existing?.quizPassed !== true) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pass the lesson quiz before completing this lesson",
    });
  }

  const now = new Date();
  let progress;
  if (existing) {
    [progress] = await db
      .update(lessonProgress)
      .set({ completed: true, watchedAt: now, updatedAt: now })
      .where(eq(lessonProgress.id, existing.id))
      .returning();
  } else {
    [progress] = await db
      .insert(lessonProgress)
      .values({
        id: randomUUID(),
        userId,
        lessonId,
        completed: true,
        watchedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
  }

  // Update course progress
  const totalLessons = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(lessons)
    .where(eq(lessons.courseId, lesson.courseId))
    .then((r) => r[0]?.count || 1);

  const completedLessons = await db
    .select({ count: sql<number>`COALESCE(SUM(CASE WHEN ${lessonProgress.completed} = 1 THEN 1 ELSE 0 END), 0)` })
    .from(lessons)
    .leftJoin(
      lessonProgress,
      and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, userId))
    )
    .where(eq(lessons.courseId, lesson.courseId))
    .then((r) => r[0]?.count || 0);

  const newProgress = Math.round((completedLessons / totalLessons) * 100);

  await db
    .update(courseEnrollments)
    .set({
      progress: newProgress,
      completedAt: newProgress === 100 ? now : null,
      lastAccessedAt: now,
      updatedAt: now,
    })
    .where(eq(courseEnrollments.id, enrollment.id));

  // Check and award badges when course is completed
  if (newProgress === 100) {
    try {
      await checkAndAwardBadges(userId);
    } catch (error) {
      console.error("Failed to check and award badges after course completion:", error);
    }
  }

  return progress;
}

export async function updateLessonProgress(
  userId: string,
  lessonId: string,
  progressPercent: number
) {
  const lesson = await db
    .select({ courseId: lessons.courseId })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1)
    .then((r) => r[0]);
  if (!lesson) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
  }

  const enrollment = await getEnrollment(userId, lesson.courseId);
  if (!enrollment) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You must be enrolled in this course" });
  }

  const existing = await db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonId, lessonId)
      )
    )
    .limit(1)
    .then((r) => r[0]);

  const now = new Date();
  const data = {
    progressPercent,
    completed: progressPercent === 100,
    watchedAt: progressPercent === 100 ? now : existing?.watchedAt,
    startedAt: existing?.startedAt || now,
    updatedAt: now,
  };

  let result;
  if (existing) {
    [result] = await db
      .update(lessonProgress)
      .set(data)
      .where(eq(lessonProgress.id, existing.id))
      .returning();
  } else {
    [result] = await db
      .insert(lessonProgress)
      .values({
        id: randomUUID(),
        userId,
        lessonId,
        progressPercent,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
  }

  await db
    .update(courseEnrollments)
    .set({ lastAccessedAt: now, updatedAt: now })
    .where(eq(courseEnrollments.id, enrollment.id));

  return result;
}