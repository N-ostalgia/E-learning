import { router, publicProcedure, activeUserProcedure } from "@/server/trpc/trpc";
import { z } from "zod";
import {
  listPosts,
  createPost,
  updatePost,
  deletePost,
  listComments,
  createComment,
  updateComment,
  deleteComment,
  toggleVote,
  toggleBookmark,
  createReport,
  listBookmarks,
  togglePinPost,
  togglePinComment,
  getPost,
} from "./feed.service";

export const feedRouter = router({
  list: publicProcedure
    .input(
      z.object({
        communityId: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
        savedOnly: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;
      return listPosts(input, userId);
    }),

  create: activeUserProcedure
    .input(
      z.object({
        communityId: z.string().uuid(),
        title: z.string().max(200).optional(),
        content: z.string().min(1).max(10000),
        type: z.enum(["post", "announcement", "question"]).default("post"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createPost(ctx.session.user.id, input);
    }),

  update: activeUserProcedure
    .input(
      z.object({
        postId: z.string().uuid(),
        title: z.string().max(200).optional(),
        content: z.string().min(1).max(10000),
        type: z.enum(["post", "announcement", "question"]).default("post"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return updatePost(ctx.session.user.id, input);
    }),

  delete: activeUserProcedure
    .input(
      z.object({
        postId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return deletePost(ctx.session.user.id, input.postId);
    }),

  getComments: publicProcedure
    .input(
      z.object({
        postId: z.string().uuid(),
        parentId: z.string().uuid().optional(),
        sort: z.enum(["newest", "oldest", "liked"]).optional().default("newest"),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;
      return listComments(
        input.postId,
        input.parentId,
        userId,
        input.sort,
        input.limit,
        input.cursor
      );
    }),

  createComment: activeUserProcedure
    .input(
      z.object({
        postId: z.string().uuid(),
        content: z.string().min(1).max(5000),
        parentCommentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createComment(ctx.session.user.id, input);
    }),

  updateComment: activeUserProcedure
    .input(
      z.object({
        commentId: z.string().uuid(),
        content: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return updateComment(ctx.session.user.id, input);
    }),

  deleteComment: activeUserProcedure
    .input(
      z.object({
        commentId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return deleteComment(ctx.session.user.id, input.commentId);
    }),

  togglePin: activeUserProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return togglePinPost(ctx.session.user.id, input.postId);
    }),

  togglePinComment: activeUserProcedure
    .input(z.object({ commentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return togglePinComment(ctx.session.user.id, input.commentId);
    }),


    get: publicProcedure
      .input(z.object({ postId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session?.user?.id ?? null;
        return getPost(input.postId, userId);
      }),
  toggleVote: activeUserProcedure
    .input(
      z.object({
        targetId: z.string().uuid(),
        targetType: z.enum(["post", "comment"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return toggleVote(ctx.session.user.id, input);
    }),

  toggleBookmark: activeUserProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return toggleBookmark(ctx.session.user.id, input.postId);
    }),

  createReport: activeUserProcedure
    .input(
      z.object({
        targetId: z.string().uuid(),
        targetType: z.enum(["post", "comment"]),
        reason: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createReport(ctx.session.user.id, input);
    }),

  listBookmarks: activeUserProcedure.query(async ({ ctx }) => {
    return listBookmarks(ctx.session.user.id);
  }),
});

