// src/server/modules/quiz/quiz.router.ts
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { quizAttempts } from "@/lib/db/schema";
import { quizQuestions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getQuizByLessonId,
  getQuizForOwner,
  getQuizWithQuestions,
  createQuiz,
  createQuizQuestions,
  updateQuiz,
  deleteQuiz,
  startQuizAttempt,
  submitQuizAttempt,
  getQuizAttempts,
  getLatestQuizAttempt,
  getQuizAttemptsCount,
  deleteQuizQuestions,
  verifyQuizOwner,
} from "./quiz.service";

export const quizRouter = router({
  getByLesson: protectedProcedure
    .input(z.object({ lessonId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const quiz = await getQuizByLessonId(input.lessonId);
      if (!quiz) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
      }
      return quiz;
    }),

  getForOwner: protectedProcedure
    .input(z.object({ lessonId: z.string().min(1) }))
    .query(async ({ ctx, input }) => getQuizForOwner(input.lessonId, ctx.session.user.id)),

  getWithQuestions: protectedProcedure
    .input(z.object({ quizId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const quiz = await getQuizWithQuestions(input.quizId);
      if (!quiz) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
      }
      await verifyQuizOwner(input.quizId, ctx.session.user.id);
      return quiz;
    }),

  create: protectedProcedure
    .input(
      z.object({
        lessonId: z.string().min(1),
        title: z.string().optional(),
        description: z.string().optional(),
        passingScore: z.number().min(0).max(100).default(80),
        timeLimit: z.number().min(0).optional(),
        questions: z.array(
          z.object({
            question: z.string().min(1),
            type: z.enum(["multiple_choice", "true_false"]),
            options: z.array(z.string()).min(2),
            correctAnswer: z.string().min(1),
            explanation: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const quiz = await createQuiz({
        userId: ctx.session.user.id,
        lessonId: input.lessonId,
        title: input.title,
        description: input.description,
        passingScore: input.passingScore,
        timeLimit: input.timeLimit,
      });
      await createQuizQuestions(quiz.id, ctx.session.user.id, input.questions);
      return quiz;
    }),

  update: protectedProcedure
    .input(
      z.object({
        quizId: z.string().min(1),
        title: z.string().optional(),
        description: z.string().optional(),
        passingScore: z.number().min(0).max(100).optional(),
        timeLimit: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { quizId, ...data } = input;
      return updateQuiz(quizId, ctx.session.user.id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ quizId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return deleteQuiz(input.quizId, ctx.session.user.id);
    }),

  startAttempt: protectedProcedure
    .input(z.object({ quizId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return startQuizAttempt(ctx.session.user.id, input.quizId);
    }),

  submitAttempt: protectedProcedure
    .input(
      z.object({
        attemptId: z.string().min(1),
        answers: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return submitQuizAttempt(ctx.session.user.id, input.attemptId, input.answers);
    }),

  attempts: protectedProcedure
    .input(z.object({ quizId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return getQuizAttempts(ctx.session.user.id, input.quizId);
    }),

  latestAttempt: protectedProcedure
    .input(z.object({ quizId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return getLatestQuizAttempt(ctx.session.user.id, input.quizId);
    }),

  attemptsCount: protectedProcedure
    .input(z.object({ quizId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return getQuizAttemptsCount(ctx.session.user.id, input.quizId);
    }),
    deleteQuestions: protectedProcedure
  .input(z.object({ quizId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    return deleteQuizQuestions(input.quizId, ctx.session.user.id);
  }),
  createQuestions: protectedProcedure
  .input(
    z.object({
      quizId: z.string().min(1),
      questions: z.array(
        z.object({
          question: z.string().min(1),
          type: z.enum(["multiple_choice", "true_false"]),
          options: z.array(z.string()).min(2),
          correctAnswer: z.string().min(1),
          explanation: z.string().optional(),
        })
      ),
    })
  )
  .mutation(async ({ ctx, input }) => {
    return createQuizQuestions(input.quizId, ctx.session.user.id, input.questions);
  }),
  // Timer check endpoint
  checkTime: protectedProcedure
    .input(z.object({ attemptId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const attempt = await db
        .select()
        .from(quizAttempts)
        .where(eq(quizAttempts.id, input.attemptId))
        .limit(1)
        .then((r) => r[0]);

      if (!attempt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Attempt not found" });
      }

      if (attempt.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }

      const now = new Date();
      const startedAt = new Date(attempt.startedAt);
      const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      const remainingSeconds = attempt.expiresAt
        ? Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - now.getTime()) / 1000))
        : null;

      return {
        elapsedSeconds,
        remainingSeconds,
        expired: remainingSeconds !== null && remainingSeconds <= 0,
        timeLimit: attempt.expiresAt !== null,
      };
    }),
});