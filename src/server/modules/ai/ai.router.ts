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
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
  correctAnswerIndex: z.number().int().min(0),
  explanation: z.string().min(1),
  sourceStartSeconds: z.number().int().min(0).optional(),
  sourceEndSeconds: z.number().int().min(0).optional(),
});

export const aiRouter = router({
  generateQuiz: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return startQuizGeneration(ctx.session.user.id, input.lessonId);
    }),

  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      return getQuizGenerationJob(ctx.session.user.id, input.jobId);
    }),

  saveGeneratedQuiz: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        title: z.string().min(1),
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
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return discardQuizGenerationJob(ctx.session.user.id, input.jobId);
    }),
});