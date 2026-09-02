// src/server/modules/profile/profile.router.ts
import { router, publicProcedure, activeUserProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getProfileByUsername,
  getProfileById,
  updateProfile,
  getUserActivity,
  getUserCommunities,
  getUserStats,
  deleteAccount,
} from "./profile.service";

const updateProfileInput = z.object({
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  website: z.string().url().nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  github: z.string().max(50).nullable().optional(),
  twitter: z.string().max(50).nullable().optional(),
  linkedin: z.string().url().nullable().optional(),
});

export const profileRouter = router({
  getByUsername: publicProcedure
    .input(
      z.object({
        username: z.string().trim().min(1).max(50),
      })
    )
    .query(async ({ input }) => {
      const profile = await getProfileByUsername(input.username);
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found.",
        });
      }
      return profile;
    }),

  getById: activeUserProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ input }) => {
      const profile = await getProfileById(input.userId);
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found.",
        });
      }
      return profile;
    }),

  update: activeUserProcedure
    .input(updateProfileInput)
    .mutation(async ({ ctx, input }) => {
      return updateProfile(ctx.session.user.id, input);
    }),
  deleteAccount: activeUserProcedure.mutation(async ({ ctx }) => {
    return deleteAccount(ctx.session.user.id);
  }),
  getActivity: publicProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return getUserActivity(input.userId, {
        limit: input.limit,
        cursor: input.cursor,
      });
    }),

  getCommunities: publicProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ input }) => {
      return getUserCommunities(input.userId);
    }),

  getStats: publicProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ input }) => {
      return getUserStats(input.userId);
    }),
});

