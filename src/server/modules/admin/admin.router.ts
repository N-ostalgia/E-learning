// src/server/modules/admin/admin.router.ts
import { router } from "@/server/trpc/trpc";
import { z } from "zod";
import { adminProcedure, superAdminProcedure } from "@/server/trpc/trpc";
import * as service from "./admin.service";

export const adminRouter = router({
  reports: router({
    list: adminProcedure
      .input(
        z
          .object({
            status: z.enum(["pending", "reviewed", "dismissed"]).optional(),
            limit: z.number().optional(),
            cursor: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const { status, limit, cursor } = input || {};
        return await service.listReports(status as any, limit, cursor);
      }),
    update: adminProcedure
      .input(
        z.object({
          reportId: z.string(),
          status: z.enum(["pending", "reviewed", "dismissed"]),
        })
      )
      .mutation(async ({ input }) => {
        return await service.updateReportStatus(input.reportId, input.status as any);
      }),
  }),

  content: router({
    delete: adminProcedure
      .input(z.object({ targetType: z.enum(["post", "comment"]), targetId: z.string() }))
      .mutation(async ({ input }) => {
        return await service.deleteContent(input.targetType, input.targetId);
      }),
  }),

  users: router({
    list: adminProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            role: z.string().optional(),
            limit: z.number().optional(),
            cursor: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const { search, role, limit, cursor } = input || {};
        return await service.listUsers(search, role, limit, cursor);
      }),
    suspend: adminProcedure
      .input(z.object({ userId: z.string(), duration: z.number().optional() }))
      .mutation(async ({ input }) => {
        return await service.suspendUser(input.userId, input.duration);
      }),
    unsuspend: adminProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input }) => {
        return await service.unsuspendUser(input.userId);
      }),
    updateRole: superAdminProcedure
      .input(z.object({ userId: z.string(), role: z.enum(["member", "admin", "super_admin"]) }))
      .mutation(async ({ input }) => {
        return await service.updateUserRole(input.userId, input.role);
      }),
    delete: superAdminProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input }) => {
        return await service.deleteUser(input.userId);
      }),
  }),

  communities: router({
    list: adminProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            limit: z.number().optional(),
            cursor: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const { search, limit, cursor } = input || {};
        return await service.listCommunities(search, limit, cursor);
      }),
    delete: adminProcedure
      .input(z.object({ communityId: z.string() }))
      .mutation(async ({ input }) => {
        return await service.deleteCommunity(input.communityId);
      }),
  }),

  stats: router({
    get: adminProcedure.query(async () => {
      return await service.getPlatformStats();
    }),
  }),

  health: router({
    get: adminProcedure.query(async () => {
      return await service.getSystemHealth();
    }),
  }),

  settings: router({
    get: superAdminProcedure.query(async () => {
      return await service.getSettings();
    }),
    update: superAdminProcedure
      .input(
        z
          .object({
            platformName: z.string().optional(),
            platformTagline: z.string().optional(),
            supportEmail: z.string().optional(),
            allowRegistration: z.boolean().optional(),
            defaultUserRole: z.string().optional(),
            requireEmailVerification: z.boolean().optional(),
            usernameMinLength: z.number().optional(),
            usernameMaxLength: z.number().optional(),
            autoSuspendThreshold: z.number().optional(),
            postApprovalRequired: z.boolean().optional(),
            commentApprovalRequired: z.boolean().optional(),
            maxCommunitiesPerUser: z.number().optional(),
            defaultCommunityPrivacy: z.string().optional(),
            gamificationEnabled: z.boolean().optional(),
            pointsForPost: z.number().optional(),
            pointsForComment: z.number().optional(),
            pointsForLikeReceived: z.number().optional(),
            pointsForLessonComplete: z.number().optional(),
            stripeMode: z.string().optional(),
            platformFee: z.number().optional(),
            minimumPayout: z.number().optional(),
            welcomeEmailEnabled: z.boolean().optional(),
            notificationEmailEnabled: z.boolean().optional(),
            digestFrequency: z.string().optional(),
          })
          .optional()
      )
      .mutation(async ({ input }) => {
        return await service.updateSettings(input || {});
      }),
  }),
});