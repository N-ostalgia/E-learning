import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { getAllBadges, getUserBadges } from "./badge.service";

export const badgeRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getAllBadges();
  }),

  myBadges: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return getUserBadges(userId);
  }),
});