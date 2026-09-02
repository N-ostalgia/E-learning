// src/server/modules/course/review.router.ts
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { z } from "zod";
import { getCourseReviews, getUserReview, createReview, updateReview } from "./review.service";

export const reviewRouter = router({
  list: protectedProcedure
    .input(z.object({ courseId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return getCourseReviews(input.courseId);
    }),

  myReview: protectedProcedure
    .input(z.object({ courseId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return getUserReview(ctx.session.user.id, input.courseId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        rating: z.number().min(1).max(5),
        review: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createReview({
        userId: ctx.session.user.id,
        courseId: input.courseId,
        rating: input.rating,
        review: input.review,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        reviewId: z.string().min(1),
        rating: z.number().min(1).max(5).optional(),
        review: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { reviewId, ...data } = input;
      return updateReview(ctx.session.user.id, reviewId, data);
    }),
});