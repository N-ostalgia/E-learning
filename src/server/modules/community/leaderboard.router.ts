import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../../trpc/trpc";
import { db } from "../../../lib/db";
import { communities } from "../../../lib/db/schema";
import { eq } from "drizzle-orm";
import { getCommunityLeaderboard } from "@/server/modules/gamification/points.service";
import { checkMembership } from "./community.service";

export const leaderboardRouter = router({
  // Get community leaderboard
  getLeaderboard: publicProcedure
    .input(
      z.object({
        communitySlug: z.string().trim().min(1).max(100),
        timeRange: z.enum(["all", "week", "month"]).default("all"),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const { communitySlug, timeRange, limit } = input;

      // Get the community
      const community = await db.query.communities.findFirst({
        where: eq(communities.slug, communitySlug),
      });

      if (!community) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Community not found",
        });
      }

      // Check if user is a member (for private communities)
      const userId = ctx.session?.user?.id ?? null;
      if (!community.isPublic) {
        if (!userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This community is private",
          });
        }
        const membership = await checkMembership(userId, community.id);
        if (!membership.isMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You must be a member to view the leaderboard",
          });
        }
      }

      const leaderboard = await getCommunityLeaderboard(
        community.id,
        timeRange,
        limit
      );

      // Get the current user's rank and points if logged in
      let currentUserRank: number | null = null;
      let currentUserPoints: number = 0;

      if (userId) {
        // Get all users ranked for this community to find current user's position
        const allRanks = await getCommunityLeaderboard(
          community.id,
          timeRange,
          100 // Get more to find user
        );
        const userEntry = allRanks.find((r) => r.userId === userId);
        if (userEntry) {
          currentUserRank = userEntry.rank;
          currentUserPoints = userEntry.points;
        }
      }

      return {
        leaderboard,
        currentUserRank,
        currentUserPoints,
        timeRange,
        communityId: community.id,
        communityName: community.name,
      };
    }),
});