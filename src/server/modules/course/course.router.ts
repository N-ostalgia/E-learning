// src/server/modules/course/course.router.ts
import { router, protectedProcedure, activeUserProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { courses, communities, lessons, courseEnrollments, lessonProgress } from "@/lib/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  getCourse,
  getCourseWithLessons,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  enrollInCourse,
  getEnrollment,
  markLessonComplete,
  updateLessonProgress,
} from "./course.service";

export const courseRouter = router({
  // ============================
  // COURSE ENDPOINTS
  // ============================

  list: protectedProcedure
    .input(z.object({ communityId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return listCourses(input.communityId, ctx.session.user.id);
    }),

  get: protectedProcedure
    .input(z.object({ courseId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const course = await getCourseWithLessons(input.courseId, ctx.session.user.id);
      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }
      return course;
    }),

  create: protectedProcedure
    .input(
      z.object({
        communityId: z.string().min(1),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        price: z.number().min(0).default(0),
        imageUrl: z.string().optional(),
        imageKey: z.string().optional(),
        isPublished: z.boolean().default(false),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createCourse({ ...input, userId: ctx.session.user.id });
    }),

  update: protectedProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        price: z.number().min(0).optional(),
        imageUrl: z.string().optional(),
        imageKey: z.string().optional(),
        isPublished: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { courseId, ...data } = input;
      return updateCourse(courseId, ctx.session.user.id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ courseId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return deleteCourse(input.courseId, ctx.session.user.id);
    }),

  // ============================
  // LESSON ENDPOINTS
  // ============================

  createLesson: protectedProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        content: z.string().optional(),
        videoUrl: z.string().optional(),
        videoKey: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        thumbnailKey: z.string().optional(),
        duration: z.number().min(0).default(0),
        isFree: z.boolean().default(false),
        isPublished: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createLesson({ ...input, userId: ctx.session.user.id });
    }),

  updateLesson: protectedProcedure
    .input(
      z.object({
        lessonId: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        videoUrl: z.string().optional(),
        videoKey: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        thumbnailKey: z.string().optional(),
        duration: z.number().min(0).optional(),
        isFree: z.boolean().optional(),
        isPublished: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { lessonId, ...data } = input;
      return updateLesson(lessonId, ctx.session.user.id, data);
    }),

  deleteLesson: protectedProcedure
    .input(z.object({ lessonId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return deleteLesson(input.lessonId, ctx.session.user.id);
    }),

  reorderLessons: protectedProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        lessonIds: z.array(z.string().min(1)),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return reorderLessons(input.courseId, ctx.session.user.id, input.lessonIds);
    }),

  // ============================
  // ENROLLMENT & PROGRESS
  // ============================

  enroll: activeUserProcedure
    .input(z.object({ courseId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return enrollInCourse(ctx.session.user.id, input.courseId);
    }),

  enrollment: protectedProcedure
    .input(z.object({ courseId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return getEnrollment(ctx.session.user.id, input.courseId);
    }),

  markLessonComplete: activeUserProcedure
    .input(z.object({ lessonId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return markLessonComplete(ctx.session.user.id, input.lessonId);
    }),

  updateLessonProgress: activeUserProcedure
    .input(
      z.object({
        lessonId: z.string().min(1),
        progressPercent: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return updateLessonProgress(ctx.session.user.id, input.lessonId, input.progressPercent);
    }),

  // ============================
  // VIDEO PROGRESS
  // ============================

  updateProgress: activeUserProcedure
    .input(
      z.object({
        lessonId: z.string().min(1),
        progressPercent: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const lesson = await db
        .select()
        .from(lessons)
        .where(eq(lessons.id, input.lessonId))
        .limit(1)
        .then((r) => r[0]);

      if (!lesson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
      }

      const enrollment = await db
        .select()
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.userId, userId),
            eq(courseEnrollments.courseId, lesson.courseId)
          )
        )
        .limit(1)
        .then((r) => r[0]);

      if (!enrollment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You must be enrolled in this course" });
      }

      const existing = await db
        .select()
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, userId),
            eq(lessonProgress.lessonId, input.lessonId)
          )
        )
        .limit(1)
        .then((r) => r[0]);

      const now = new Date();
      if (existing) {
        await db
          .update(lessonProgress)
          .set({
            videoWatchedPercent: input.progressPercent,
            updatedAt: now,
          })
          .where(eq(lessonProgress.id, existing.id));
      } else {
        await db
          .insert(lessonProgress)
          .values({
            id: randomUUID(),
            userId,
            lessonId: input.lessonId,
            videoWatchedPercent: input.progressPercent,
            createdAt: now,
            updatedAt: now,
          });
      }

      return { success: true };
    }),

  // ============================
  // MARK VIDEO COMPLETE (stays unlocked)
  // ============================

  markVideoComplete: activeUserProcedure
    .input(z.object({ lessonId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const lesson = await db
        .select()
        .from(lessons)
        .where(eq(lessons.id, input.lessonId))
        .limit(1)
        .then((r) => r[0]);

      if (!lesson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
      }

      const enrollment = await db
        .select()
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.userId, userId),
            eq(courseEnrollments.courseId, lesson.courseId)
          )
        )
        .limit(1)
        .then((r) => r[0]);

      if (!enrollment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You must be enrolled in this course" });
      }

      const existing = await db
        .select()
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, userId),
            eq(lessonProgress.lessonId, input.lessonId)
          )
        )
        .limit(1)
        .then((r) => r[0]);

      const now = new Date();
      if (existing) {
        await db
          .update(lessonProgress)
          .set({
            videoCompleted: true,
            videoWatchedPercent: 100,
            updatedAt: now,
          })
          .where(eq(lessonProgress.id, existing.id));
      } else {
        await db
          .insert(lessonProgress)
          .values({
            id: randomUUID(),
            userId,
            lessonId: input.lessonId,
            videoCompleted: true,
            videoWatchedPercent: 100,
            createdAt: now,
            updatedAt: now,
          });
      }

      return { success: true };
    }),

  // ============================
  // MY ENROLLED COURSES (My Learning)
  // ============================

  myEnrolledCourses: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    const result = await db
      .select({
        id: courses.id,
        title: courses.title,
        imageUrl: courses.imageUrl,
        price: courses.price,
        communitySlug: communities.slug,
        progress: courseEnrollments.progress,
        lessons: sql<number>`(SELECT COUNT(*) FROM lessons WHERE lessons.course_id = courses.id)`,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
      .innerJoin(communities, eq(communities.id, courses.communityId))
      .where(eq(courseEnrollments.userId, userId))
      .orderBy(desc(courseEnrollments.updatedAt));
    
    return result;
  }),
});