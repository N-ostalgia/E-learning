// src/server/modules/notification/notification.router.ts
import { router, activeUserProcedure } from "@/server/trpc/trpc";
import { z } from "zod";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "./notification.service";

export const notificationRouter = router({
  list: activeUserProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
        filter: z.enum(["unread", "all"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      return listNotifications(ctx.session.user.id, input);
    }),

  getUnreadCount: activeUserProcedure.query(async ({ ctx }) => {
    return getUnreadCount(ctx.session.user.id);
  }),

  markAsRead: activeUserProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return markAsRead(ctx.session.user.id, input.ids);
    }),

  markAllAsRead: activeUserProcedure.mutation(async ({ ctx }) => {
    return markAllAsRead(ctx.session.user.id);
  }),

  delete: activeUserProcedure
    .input(
      z.object({
        id: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return deleteNotification(ctx.session.user.id, input.id);
    }),
});
