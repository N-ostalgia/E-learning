// src/server/modules/ai/ai.router.ts

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import {
  startQuizGeneration,
  getQuizGenerationJob,
  saveGeneratedQuiz,
  discardQuizGenerationJob,
} from "./ai.service";

const questionInput = z.object({
  question: z.string().trim().min(1).max(2000),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1).max(2000),
  sourceStartSeconds: z.number().int().min(0).optional(),
  sourceEndSeconds: z.number().int().min(0).optional(),
}).refine((question) => question.correctAnswerIndex < question.options.length, {
  message: "Correct answer must reference an available option",
  path: ["correctAnswerIndex"],
});

export const aiRouter = router({
  generateQuiz: protectedProcedure
    .input(z.object({ lessonId: z.string().trim().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      return startQuizGeneration(ctx.session.user.id, input.lessonId);
    }),

  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string().trim().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      return getQuizGenerationJob(ctx.session.user.id, input.jobId);
    }),

  saveGeneratedQuiz: protectedProcedure
    .input(
      z.object({
        jobId: z.string().trim().min(1).max(100),
        title: z.string().trim().min(1).max(200),
        questions: z.array(questionInput).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return saveGeneratedQuiz(ctx.session.user.id, input.jobId, {
        title: input.title,
        questions: input.questions,
      });
    }),

  discardJob: protectedProcedure
    .input(z.object({ jobId: z.string().trim().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      return discardQuizGenerationJob(ctx.session.user.id, input.jobId);
    }),
});