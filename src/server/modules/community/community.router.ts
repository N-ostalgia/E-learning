// src/server/modules/community/community.router.ts
import { router, publicProcedure, activeUserProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { communities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  listCommunities,
  getCommunityBySlug,
  checkMembership,
  joinCommunity,
  leaveCommunity,
  createCommunity,
  getMyCommunities,
  listMembers,
  updateCommunityPrice,
  updateCommunity,
  deleteCommunityAndCancelSubscriptions,
} from "./community.service";
import { createCommunityCheckout } from "@/server/modules/payment/payment.service";

const listCommunitiesInput = z.object({
  limit: z.number().min(1).max(50).default(12),
  cursor: z.string().nullable().optional(),
  search: z.string().max(100).nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  direction: z.enum(["forward", "backward"]).optional(),
});

export type ListCommunitiesInputType = z.infer<typeof listCommunitiesInput>;

export const communityRouter = router({
  list: publicProcedure
    .input(listCommunitiesInput)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;
      return listCommunities(input, userId);
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;
      const community = await getCommunityBySlug(input.slug, userId);
      if (!community) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Community not found",
        });
      }
      return community;
    }),

  checkMembership: activeUserProcedure
    .input(z.object({ communityId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return checkMembership(ctx.session.user.id, input.communityId);
    }),

  join: activeUserProcedure
    .input(z.object({ communityId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return joinCommunity(ctx.session.user.id, input.communityId);
    }),

  leave: activeUserProcedure
    .input(z.object({ communityId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return leaveCommunity(ctx.session.user.id, input.communityId);
    }),

  create: activeUserProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        description: z.string().max(500).optional().default(""),
        isPublic: z.boolean().default(true),
        price: z.number().min(0).nullable().optional().default(null),
        category: z.string().max(50).nullable().optional().default(null),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createCommunity(ctx.session.user.id, input);
    }),

  myCommunities: activeUserProcedure.query(async ({ ctx }) => {
    return getMyCommunities(ctx.session.user.id);
  }),
  
  updatePrice: activeUserProcedure
    .input(z.object({ communityId: z.string().min(1), price: z.number().finite().min(0).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      return updateCommunityPrice(ctx.session.user.id, input.communityId, input.price ?? null);
    }),

  // Update community settings (name, description, category, visibility, images)
  update: activeUserProcedure
    .input(
      z.object({
        communityId: z.string().min(1),
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional(),
        category: z.string().max(50).nullable().optional(),
        isPublic: z.boolean().optional(),
        avatarUrl: z.string().optional(),
        coverUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { communityId, ...data } = input;
      return updateCommunity(communityId, ctx.session.user.id, data);
    }),

  listMembers: activeUserProcedure
    .input(z.object({ communityId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return listMembers(input.communityId, ctx.session.user.id);
    }),

  createCheckout: activeUserProcedure
    .input(z.object({ communityId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Get community by ID directly
      const community = await db.query.communities.findFirst({
        where: (communities, { eq }) => eq(communities.id, input.communityId),
      });
      
      if (!community) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Community not found",
        });
      }

      if (!community.price || community.price <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This community is free. Use the join endpoint instead.",
        });
      }

      const membership = await checkMembership(userId, input.communityId);
      if (membership.isMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this community.",
        });
      }

      const session = await createCommunityCheckout(userId, {
        communityId: input.communityId,
      });

      return { url: session.url };
    }),

  delete: activeUserProcedure
    .input(z.object({ communityId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return deleteCommunityAndCancelSubscriptions(ctx.session.user.id, input.communityId);
    }),
});