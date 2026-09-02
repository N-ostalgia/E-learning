import type { posts, comments, votes, users, bookmarks, mentions, reports } from "@/lib/db/schema";

export type Post = Omit<typeof posts.$inferSelect, "createdAt" | "updatedAt"> & {
  createdAt: Date | string | number;
  updatedAt: Date | string | number;
};
export type NewPost = typeof posts.$inferInsert;
export type Comment = Omit<typeof comments.$inferSelect, "createdAt" | "updatedAt"> & {
  createdAt: Date | string | number;
  updatedAt: Date | string | number;
};
export type NewComment = typeof comments.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
export type Mention = typeof mentions.$inferSelect;
export type NewMention = typeof mentions.$inferInsert;

export type PostWithDetails = Post & {
  author: Pick<typeof users.$inferSelect, "id" | "name" | "image" | "username">;
  community: {
    id: string;
    slug: string;
    name: string;
    avatarUrl?: string | null;
    ownerId: string;
  };
  commentCount: number;
  voteCount: number;
  userVote: number | null;
  bookmarkCount: number;
  isBookmarked: boolean;
};

export type CommentWithDetails = Comment & {
  author: Pick<typeof users.$inferSelect, "id" | "name" | "image" | "username">;
  voteCount: number;
  userVote: number | null;
  replyCount: number;
  isDeleted: boolean;
  isPinned: boolean;
  replies: CommentWithDetails[];
};

export type CommentSort = "newest" | "oldest" | "liked";

export type ListCommentsResult = {
  items: CommentWithDetails[];
  nextCursor: string | null;
};

export type ListPostsInput = {
  communityId?: string;
  limit: number;
  cursor?: string | null;
  savedOnly?: boolean;
};

export type CreatePostInput = {
  communityId: string;
  title?: string;
  content: string;
  type?: "post" | "announcement" | "question";
};

export type UpdatePostInput = {
  postId: string;
  title?: string;
  content: string;
  type?: "post" | "announcement" | "question";
};

export type CreateCommentInput = {
  postId: string;
  content: string;
  parentCommentId?: string;
};

export type UpdateCommentInput = {
  commentId: string;
  content: string;
};

export type ToggleVoteInput = {
  targetId: string;
  targetType: "post" | "comment";
};

export type CreateReportInput = {
  targetId: string;
  targetType: "post" | "comment";
  reason: string;
};

export type ToggleBookmarkResult = {
  isBookmarked: boolean;
  bookmarkCount: number;
};

