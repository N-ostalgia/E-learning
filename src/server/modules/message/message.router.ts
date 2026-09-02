import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import {
  getOrCreateConversation,
  sendMessage,
  getConversations,
  getMessages,
  markAllRead,
  unblockUser,
} from "./message.service";

export const messageRouter = router({
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    return getConversations(ctx.session.user.id);
  }),

  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return getMessages(
        input.conversationId,
        ctx.session.user.id,
        input.limit,
        input.cursor
      );
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return sendMessage(ctx.session.user.id, input.conversationId, input.content);
    }),

  markAllRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await markAllRead(ctx.session.user.id, input.conversationId);
      return { success: true };
    }),

  getOrCreate: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conversationId = await getOrCreateConversation(
        ctx.session.user.id,
        input.userId
      );
      return { conversationId };
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const conversations = await getConversations(ctx.session.user.id);
    return conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  }),

  // Only unblocks — you're only ever unblocking *from* a conversation
  // screen, and blocking someone should stay on the profile/report flow
  // where it already lives, not be duplicated here.
  unblockUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await unblockUser(ctx.session.user.id, input.userId);
      return { success: true };
    }),
});