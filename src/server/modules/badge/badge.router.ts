import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/server/trpc/trpc";
import { getAllBadges, getUserBadges } from "./badge.service";

export const badgeRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getAllBadges();
  }),

  myBadges: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return getUserBadges(userId);
  }),

  getByUser: publicProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ input }) => getUserBadges(input.userId)),
});