import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { reportUser, blockUser, unblockUser, isBlocked } from "./user.service";

export const userRouter = router({
  report: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        reason: z.string().min(1).max(200),
        details: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await reportUser(ctx.session.user.id, input.userId, input.reason, input.details);
      return { success: true };
    }),

  block: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await blockUser(ctx.session.user.id, input.userId);
      return { success: true };
    }),

  unblock: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await unblockUser(ctx.session.user.id, input.userId);
      return { success: true };
    }),

  isBlocked: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return { blocked: await isBlocked(ctx.session.user.id, input.userId) };
    }),
});