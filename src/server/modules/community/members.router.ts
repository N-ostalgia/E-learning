import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../../trpc/trpc";
import { db } from "../../../lib/db";
import { communities, communityMembers, users } from "../../../lib/db/schema";
import { checkMembership, removeMemberFromCommunity } from "./community.service";

export const membersRouter = router({
  // Get members for a community with pagination and search
  getCommunityMembers: protectedProcedure
    .input(
      z.object({
        communitySlug: z.string().trim().min(1).max(100),
        limit: z.number().int().min(1).max(200).default(100),
        search: z.string().trim().max(100).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { communitySlug, limit, search } = input;
      const userId = ctx.session.user.id;

      // First, get the community
      const community = await db.query.communities.findFirst({
        where: eq(communities.slug, communitySlug),
      });

      if (!community) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Community not found",
        });
      }

      // Check if user is a member
      const membership = await checkMembership(userId, community.id);

      // If community is private and user is not a member, deny access
      if (!community.isPublic && !membership.isMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This community is private",
        });
      }

      // Build the base conditions
      const conditions = [
        eq(communityMembers.communityId, community.id),
        eq(communityMembers.status, "active"),
      ];

      // Add search filter if provided
      if (search && search.length > 0) {
        const escapedSearch = search.replace(/[%_]/g, "\\$&");
        conditions.push(
          sql`(${users.username} LIKE ${`%${escapedSearch}%`} ESCAPE '\\' OR ${users.name} LIKE ${`%${escapedSearch}%`} ESCAPE '\\')`
        );
      }

      // Build the query
      const members = await db
        .select({
          userId: users.id,
          username: users.username,
          name: users.name,
          avatar: users.image,
          role: communityMembers.role,
          joinedAt: communityMembers.joinedAt,
          status: communityMembers.status,
        })
        .from(communityMembers)
        .innerJoin(users, eq(communityMembers.userId, users.id))
        .where(and(...conditions))
        .orderBy(
          sql`CASE 
            WHEN ${communityMembers.role} = 'owner' THEN 1 
            WHEN ${communityMembers.role} = 'admin' THEN 2 
            ELSE 3 
          END`,
          desc(communityMembers.joinedAt)
        )
        .limit(limit);

      // Count total active members
      const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, community.id),
            eq(communityMembers.status, "active")
          )
        );

      const totalMembers = Number(totalResult[0]?.count || 0);

      return {
        members,
        totalMembers,
        communityId: community.id,
        isMember: membership.isMember,
        userRole: membership.role, // 'owner' | 'admin' | 'member' | null
      };
    }),

  // Get member count for a community
  getMemberCount: publicProcedure
    .input(z.object({ communitySlug: z.string() }))
    .query(async ({ input }) => {
      const community = await db.query.communities.findFirst({
        where: eq(communities.slug, input.communitySlug),
      });

      if (!community) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Community not found",
        });
      }

      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, community.id),
            eq(communityMembers.status, "active")
          )
        );

      return {
        count: Number(result[0]?.count || 0),
      };
    }),

  // ---------- Management mutations (Owner & Admin) ----------
  promoteToAdmin: protectedProcedure
    .input(
      z.object({
        communitySlug: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { communitySlug, userId } = input;
      const currentUserId = ctx.session.user.id;

      const community = await db.query.communities.findFirst({
        where: eq(communities.slug, communitySlug),
      });
      if (!community) throw new TRPCError({ code: "NOT_FOUND", message: "Community not found" });

      const currentMembership = await checkMembership(currentUserId, community.id);
      if (!currentMembership.isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member" });
      }
      if (!currentMembership.isOwner && !currentMembership.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owners and admins can promote" });
      }

      const targetMember = await db.query.communityMembers.findFirst({
        where: and(
          eq(communityMembers.communityId, community.id),
          eq(communityMembers.userId, userId)
        ),
      });
      if (!targetMember) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      if (targetMember.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only active members can be managed" });
      }
      if (targetMember.role === "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot change the owner's role" });
      }
      if (targetMember.role === "admin") {
        throw new TRPCError({ code: "CONFLICT", message: "User is already an admin" });
      }

      await db
        .update(communityMembers)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(communityMembers.id, targetMember.id));
      return { success: true };
    }),

  demoteToMember: protectedProcedure
    .input(
      z.object({
        communitySlug: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { communitySlug, userId } = input;
      const currentUserId = ctx.session.user.id;

      const community = await db.query.communities.findFirst({
        where: eq(communities.slug, communitySlug),
      });
      if (!community) throw new TRPCError({ code: "NOT_FOUND", message: "Community not found" });

      const currentMembership = await checkMembership(currentUserId, community.id);
      if (!currentMembership.isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member" });
      }
      if (!currentMembership.isOwner && !currentMembership.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owners and admins can demote" });
      }

      const targetMember = await db.query.communityMembers.findFirst({
        where: and(
          eq(communityMembers.communityId, community.id),
          eq(communityMembers.userId, userId)
        ),
      });
      if (!targetMember) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      if (targetMember.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only active members can be managed" });
      }
      if (targetMember.role === "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot demote the owner" });
      }
      if (targetMember.role === "member") {
        throw new TRPCError({ code: "CONFLICT", message: "User is already a member" });
      }

      await db
        .update(communityMembers)
        .set({ role: "member", updatedAt: new Date() })
        .where(eq(communityMembers.id, targetMember.id));
      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        communitySlug: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { communitySlug, userId } = input;
      const currentUserId = ctx.session.user.id;

      const community = await db.query.communities.findFirst({
        where: eq(communities.slug, communitySlug),
      });
      if (!community) throw new TRPCError({ code: "NOT_FOUND", message: "Community not found" });

      const currentMembership = await checkMembership(currentUserId, community.id);
      if (!currentMembership.isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member" });
      }
      if (!currentMembership.isOwner && !currentMembership.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owners and admins can remove members" });
      }

      const targetMember = await db.query.communityMembers.findFirst({
        where: and(
          eq(communityMembers.communityId, community.id),
          eq(communityMembers.userId, userId)
        ),
      });
      if (!targetMember) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      if (targetMember.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only active members can be managed" });
      }
      if (targetMember.role === "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove the community owner" });
      }

      await removeMemberFromCommunity(userId, community.id);
      return { success: true };
    }),
});