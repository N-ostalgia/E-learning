import { db } from "@/lib/db";
import {
  posts,
  comments,
  votes,
  communityMembers,
  communities,
  users,
  bookmarks,
  mentions,
  reports,
} from "@/lib/db/schema";
import { and, eq, desc, sql, lt, gt, inArray, isNull, asc, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type {
  PostWithDetails,
  CommentWithDetails,
  ListPostsInput,
  CreatePostInput,
  UpdatePostInput,
  CreateCommentInput,
  UpdateCommentInput,
  ToggleVoteInput,
  CreateReportInput,
  CommentSort,
  ListCommentsResult,
  ToggleBookmarkResult,
  Report,
} from "./feed.types";
import { checkMembership } from "@/server/modules/community/community.service";
import { createNotification } from "@/server/modules/notification/notification.service";
import { awardPoints } from "@/server/modules/gamification/points.service";
import { checkAndAwardBadges } from "@/server/modules/badge/badge.service";

const POST_FIELDS = {
  id: posts.id,
  communityId: posts.communityId,
  authorId: posts.authorId,
  title: posts.title,
  content: posts.content,
  type: posts.type,
  isPinned: posts.isPinned,
  createdAt: posts.createdAt,
  updatedAt: posts.updatedAt,
};

const COMMENT_FIELDS = {
  id: comments.id,
  postId: comments.postId,
  authorId: comments.authorId,
  parentCommentId: comments.parentCommentId,
  content: comments.content,
  isDeleted: comments.isDeleted,
  isPinned: comments.isPinned,
  createdAt: comments.createdAt,
  updatedAt: comments.updatedAt,
};

// ---------- Helpers ----------

export function extractMentions(content: string): string[] {
  const regex = /@([a-zA-Z0-9_]+)/g;
  const matches = content.match(regex) ?? [];
  return matches.map((m) => m.slice(1));
}

async function storeMentions(
  userIds: string[],
  targetType: "post" | "comment",
  targetId: string
): Promise<void> {
  const uniqueIds = [...new Set(userIds)].filter((id) => id.length > 0);
  if (uniqueIds.length === 0) return;

  const now = new Date();
  await db
    .insert(mentions)
    .values(
      uniqueIds.map((id) => ({
        id: randomUUID(),
        userId: id,
        targetType,
        targetId,
        createdAt: now,
      }))
    )
    .onConflictDoNothing();
}

async function resolveMentionUserIds(
  communityId: string,
  usernames: string[]
): Promise<string[]> {
  if (usernames.length === 0) return [];
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(
      communityMembers,
      and(
        eq(communityMembers.userId, users.id),
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.status, "active")
      )
    )
    .where(inArray(users.username, usernames));
  return rows.map((r) => r.id);
}

async function getPostBookmarkStats(
  postId: string,
  currentUserId?: string | null
): Promise<{ bookmarkCount: number; isBookmarked: boolean }> {
  const bookmarkCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(bookmarks)
    .where(eq(bookmarks.postId, postId))
    .then((rows) => Number(rows[0]?.count ?? 0));

  const isBookmarked = currentUserId
    ? await db
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, currentUserId),
            eq(bookmarks.postId, postId)
          )
        )
        .limit(1)
        .then((rows) => rows.length > 0)
    : false;

return { bookmarkCount, isBookmarked };
}

// ---------- Notification helpers ----------

async function notifyCommunityMembers(
  communityId: string,
  excludeUserId: string,
  notification: {
    type: "post";
    actorId: string;
    targetType: "post";
    targetId: string;
    message: string;
    link: string;
  }
): Promise<void> {
  const members = await db
    .select({ userId: communityMembers.userId })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.status, "active")
      )
    );

  // Notify all members except the author. Best-effort per member.
  for (const member of members) {
    if (member.userId === excludeUserId) continue;
    try {
      await createNotification({
        userId: member.userId,
        ...notification,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to create notification for member:", error);
    }
  }
}

// ---------- Posts ----------

export async function listPosts(
  params: ListPostsInput,
  currentUserId?: string | null
): Promise<{ items: PostWithDetails[]; nextCursor: string | null }> {
  const { limit, cursor, communityId, savedOnly } = params;
  const conditions: ReturnType<typeof and>[] = [];

  if (savedOnly) {
    if (!currentUserId) {
      return { items: [], nextCursor: null };
    }
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM bookmarks
        WHERE bookmarks.post_id = posts.id
        AND bookmarks.user_id = ${currentUserId}
      )`
    );
  }

  if (communityId) {
    const community = await db
      .select({ isPublic: communities.isPublic })
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!community) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Community not found" });
    }

    if (!community.isPublic) {
      if (!currentUserId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Community membership required" });
      }

      const membership = await db
        .select({ id: communityMembers.id })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userId, currentUserId),
            eq(communityMembers.status, "active")
          )
        )
        .limit(1);

      if (membership.length === 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Community membership required" });
      }
    }

    conditions.push(eq(posts.communityId, communityId));
    conditions.push(
      or(
        eq(communities.isPublic, true),
        currentUserId
          ? sql`EXISTS (
              SELECT 1 FROM community_members
              WHERE community_members.community_id = communities.id
                AND community_members.user_id = ${currentUserId}
                AND community_members.status = 'active'
            )`
          : sql`0`
      )
    );
  } else if (currentUserId) {
    const memberCommunities = await db
      .select({ communityId: communityMembers.communityId })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.userId, currentUserId),
          eq(communityMembers.status, "active")
        )
      );

    const communityIds = memberCommunities.map((m) => m.communityId);
    if (communityIds.length > 0) {
      conditions.push(inArray(posts.communityId, communityIds));
    } else {
      return { items: [], nextCursor: null };
    }
  } else {
    const publicCommunities = await db
      .select({ id: communities.id })
      .from(communities)
      .where(eq(communities.isPublic, true));
    const communityIds = publicCommunities.map((c) => c.id);
    if (communityIds.length > 0) {
      conditions.push(inArray(posts.communityId, communityIds));
    } else {
      return { items: [], nextCursor: null };
    }
  }

  if (cursor) {
    let cursorData: { isPinned: boolean; createdAt: number };
    try {
      const parsed = JSON.parse(cursor) as Partial<typeof cursorData>;
      if (typeof parsed.isPinned !== "boolean" || typeof parsed.createdAt !== "number" || !Number.isFinite(parsed.createdAt)) {
        throw new Error("Invalid cursor");
      }
      cursorData = parsed as typeof cursorData;
    } catch {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid feed cursor" });
    }
    if (cursorData.isPinned) {
      conditions.push(
        sql`(posts.is_pinned = 1 AND posts.created_at < ${new Date(cursorData.createdAt)})
             OR posts.is_pinned = 0`
      );
    } else {
      conditions.push(
        sql`posts.is_pinned = 0 AND posts.created_at < ${new Date(cursorData.createdAt)}`
      );
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      ...POST_FIELDS,
      authorName: users.name,
      authorImage: users.image,
      authorUsername: users.username,
      communitySlug: communities.slug,
      communityName: communities.name,
      communityOwnerId: communities.ownerId,
      communityIsPublic: communities.isPublic,
      communityAvatarUrl: communities.avatarUrl,
      commentCount: sql<number>`
        (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id)
      `,
      voteCount: sql<number>`
        (SELECT COUNT(*) FROM votes WHERE votes.target_id = posts.id AND votes.target_type = 'post')
      `,
      userVote: currentUserId
        ? sql<number | null>`
            (SELECT votes.value FROM votes WHERE votes.target_id = posts.id AND votes.target_type = 'post' AND votes.user_id = ${currentUserId} LIMIT 1)
          `
        : sql<number | null>`NULL`,
      bookmarkCount: sql<number>`
        (SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = posts.id)
      `,
      isBookmarked: currentUserId
        ? sql<boolean>`
            EXISTS (
              SELECT 1 FROM bookmarks WHERE bookmarks.post_id = posts.id AND bookmarks.user_id = ${currentUserId}
            )
          `
        : sql<boolean>`0`,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(communities, eq(communities.id, posts.communityId))
    .where(whereClause)
    .orderBy(sql`posts.is_pinned DESC`, desc(posts.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];
  const nextCursor =
    hasMore && lastItem
      ? JSON.stringify({
          isPinned: Boolean(lastItem.isPinned),
          createdAt: new Date(lastItem.createdAt).getTime(),
        })
      : null;

  return {
    items: items.map((row) => ({
      id: row.id,
      communityId: row.communityId,
      authorId: row.authorId,
      title: row.title,
      content: row.content,
      type: row.type,
      isPinned: row.isPinned,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: {
        id: row.authorId,
        name: row.authorName,
        image: row.authorImage,
        username: row.authorUsername,
      },
      community: {
        id: row.communityId,
        slug: row.communitySlug,
        name: row.communityName,
        ownerId: row.communityOwnerId,
        avatarUrl: row.communityAvatarUrl,
      },
      commentCount: Number(row.commentCount),
      voteCount: Number(row.voteCount),
      userVote: row.userVote,
      bookmarkCount: Number(row.bookmarkCount),
      isBookmarked: Boolean(row.isBookmarked),
    })),
    nextCursor,
  };
}

export async function getPost(
  postId: string,
  currentUserId?: string | null
): Promise<PostWithDetails> {
  const row = await db
    .select({
      ...POST_FIELDS,
      authorName: users.name,
      authorImage: users.image,
      authorUsername: users.username,
      communitySlug: communities.slug,
      communityName: communities.name,
      communityOwnerId: communities.ownerId,
      communityIsPublic: communities.isPublic,
      commentCount: sql<number>`
        (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id)
      `,
      voteCount: sql<number>`
        (SELECT COUNT(*) FROM votes WHERE votes.target_id = posts.id AND votes.target_type = 'post')
      `,
      userVote: currentUserId
        ? sql<number | null>`
            (SELECT votes.value FROM votes WHERE votes.target_id = posts.id AND votes.target_type = 'post' AND votes.user_id = ${currentUserId} LIMIT 1)
          `
        : sql<number | null>`NULL`,
      bookmarkCount: sql<number>`
        (SELECT COUNT(*) FROM bookmarks WHERE bookmarks.post_id = posts.id)
      `,
      isBookmarked: currentUserId
        ? sql<boolean>`
            EXISTS (
              SELECT 1 FROM bookmarks WHERE bookmarks.post_id = posts.id AND bookmarks.user_id = ${currentUserId}
            )
          `
        : sql<boolean>`0`,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(communities, eq(communities.id, posts.communityId))
    .where(eq(posts.id, postId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Post not found." });
  }

  if (!row.communityIsPublic) {
    if (!currentUserId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Community membership required" });
    }

    const membership = await db
      .select({ id: communityMembers.id })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, row.communityId),
          eq(communityMembers.userId, currentUserId),
          eq(communityMembers.status, "active")
        )
      )
      .limit(1);

    if (membership.length === 0) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Community membership required" });
    }
  }

  return {
    id: row.id,
    communityId: row.communityId,
    authorId: row.authorId,
    title: row.title,
    content: row.content,
    type: row.type,
    isPinned: row.isPinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      id: row.authorId,
      name: row.authorName,
      image: row.authorImage,
      username: row.authorUsername,
    },
    community: {
      id: row.communityId,
      slug: row.communitySlug,
      name: row.communityName,
      ownerId: row.communityOwnerId,
    
    },
    commentCount: Number(row.commentCount),
    voteCount: Number(row.voteCount),
    userVote: row.userVote,
    bookmarkCount: Number(row.bookmarkCount),
    isBookmarked: Boolean(row.isBookmarked),
  };
}

export async function createPost(
  userId: string,
  data: CreatePostInput
): Promise<PostWithDetails> {
  const membership = await checkMembership(userId, data.communityId);
  if (!membership.isMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a member of this community to create posts.",
    });
  }

  const now = new Date();
  const [post] = await db
    .insert(posts)
    .values({
      id: randomUUID(),
      communityId: data.communityId,
      authorId: userId,
      title: data.title ?? null,
      content: data.content,
      type: data.type ?? "post",
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

    // Award points for creating a post (using settings)
     try {
    await awardPoints({
      userId,
      communityId: data.communityId,
      actionType: "post",
      targetId: post.id,
      description: `Created post: ${post.title || "Untitled"}`,
    });
  } catch (error) {
    console.error("Failed to award points for post creation:", error);
  }

  // Check and award badges
  try {
    await checkAndAwardBadges(userId);
  } catch (error) {
    console.error("Failed to check and award badges for post creation:", error);
  }

  // Store mentions
  const mentionedUsernames = extractMentions(data.content);
  const mentionedUserIds = await resolveMentionUserIds(
    data.communityId,
    mentionedUsernames
  );
  await storeMentions(mentionedUserIds, "post", post.id);

  // Debug: ensure mentions resolved correctly (non-blocking)
  if (mentionedUserIds.length > 0) {
    // eslint-disable-next-line no-console
    console.debug("Post mentions resolved:", mentionedUserIds);
  }

  const author = await db
    .select({ id: users.id, name: users.name, image: users.image, username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0]);

  
const community = await db
    .select({ id: communities.id, slug: communities.slug, name: communities.name, avatarUrl: communities.avatarUrl, ownerId: communities.ownerId })
    .from(communities)
    .where(eq(communities.id, data.communityId))
    .limit(1)
    .then((rows) => rows[0]);

  // Notifications: notify other community members about the new post.
  try {
    const postLink = `/community/${community?.slug ?? ""}/post/${post.id}`;
    await notifyCommunityMembers(data.communityId, userId, {
      type: "post",
      actorId: userId,
      targetType: "post",
      targetId: post.id,
      message: `${author?.name ?? "Someone"} posted in ${community?.name ?? "a community"}`,
      link: postLink,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to send post notifications:", error);
  }

  // Notifications: @mentions → notify mentioned users.
  try {
    for (const mentionedUserId of mentionedUserIds) {
      if (mentionedUserId === userId) continue;
      await createNotification({
        userId: mentionedUserId,
        type: "mention",
        actorId: userId,
        targetType: "post",
        targetId: post.id,
        message: `${author?.name ?? "Someone"} mentioned you in a post`,
        link: `/community/${community?.slug ?? ""}/post/${post.id}`,
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to send mention notifications:", error);
  }

  return {
    ...post,
    author,
    community,
    commentCount: 0,
    voteCount: 0,
    userVote: null,
    bookmarkCount: 0,
    isBookmarked: false,
  };
}

export async function updatePost(
  userId: string,
  data: UpdatePostInput
): Promise<PostWithDetails> {
  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, data.postId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!post) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Post not found.",
    });
  }

  if (post.authorId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only edit your own posts.",
    });
  }

  const [updated] = await db
    .update(posts)
    .set({
      title: data.title ?? null,
      content: data.content,
      type: data.type ?? post.type,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, data.postId))
    .returning();

  const author = await db
    .select({ id: users.id, name: users.name, image: users.image, username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0]);

  const community = await db
    .select({ id: communities.id, slug: communities.slug, name: communities.name, avatarUrl: communities.avatarUrl,ownerId: communities.ownerId })
    .from(communities)
    .where(eq(communities.id, post.communityId))
    .limit(1)
    .then((rows) => rows[0]);

  const commentCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(comments)
    .where(eq(comments.postId, data.postId))
    .then((rows) => Number(rows[0]?.count ?? 0));

  const voteCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(votes)
    .where(and(eq(votes.targetId, data.postId), eq(votes.targetType, "post")))
    .then((rows) => Number(rows[0]?.count ?? 0));

  const userVote = await db
    .select({ value: votes.value })
    .from(votes)
    .where(and(eq(votes.targetId, data.postId), eq(votes.targetType, "post"), eq(votes.userId, userId)))
    .limit(1)
    .then((rows) => rows[0]?.value ?? null);

  const { bookmarkCount, isBookmarked } = await getPostBookmarkStats(
    data.postId,
    userId
  );

  return {
    ...updated,
    author,
    community,
    commentCount,
    voteCount,
    userVote,
    bookmarkCount,
    isBookmarked,
  };
}

export async function deletePost(userId: string, postId: string): Promise<void> {
  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!post) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Post not found.",
    });
  }

  const membership = await checkMembership(userId, post.communityId);
  const isAuthor = post.authorId === userId;
  const isModerator = membership.isAdmin || membership.isOwner || membership.isModerator;

  if (!isAuthor && !isModerator) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to delete this post.",
    });
  }

  await db.delete(posts).where(eq(posts.id, postId));
}

// ---------- Comments ----------

function voteCountSql(column: AnySQLiteColumn) {
  return sql<number>`
    (SELECT COUNT(*) FROM votes WHERE votes.target_id = ${column} AND votes.target_type = 'comment')
  `;
}

// Total number of descendants (all nesting levels) for a comment.
const TOTAL_DESCENDANT_COUNT_SQL = sql<number>`
  (SELECT COUNT(*) FROM (
    WITH RECURSIVE descendants(id) AS (
      SELECT id FROM comments WHERE parent_comment_id = comments.id
      UNION ALL
      SELECT c.id FROM comments c JOIN descendants d ON c.parent_comment_id = d.id
    )
    SELECT 1 FROM descendants
  ))
`;

type CommentRow = {
  id: string;
  postId: string;
  authorId: string;
  parentCommentId: string | null;
  content: string;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: Date | string | number;
  updatedAt: Date | string | number;
  authorName: string;
  authorImage: string | null;
  authorUsername: string;
  voteCount: number;
  userVote: number | null;
  replyCount: number;
};

function commentSelect(currentUserId?: string | null) {
  return {
    ...COMMENT_FIELDS,
    authorName: users.name,
    authorImage: users.image,
    authorUsername: users.username,
    voteCount: voteCountSql(comments.id),
    userVote: currentUserId
      ? sql<number | null>`
          (SELECT votes.value FROM votes WHERE votes.target_id = comments.id AND votes.target_type = 'comment' AND votes.user_id = ${currentUserId} LIMIT 1)
        `
      : sql<number | null>`NULL`,
    replyCount: TOTAL_DESCENDANT_COUNT_SQL,
  };
}

function mapCommentRow(row: CommentRow): CommentWithDetails {
  return {
    id: row.id,
    postId: row.postId,
    authorId: row.authorId,
    parentCommentId: row.parentCommentId,
    content: row.isDeleted ? "[deleted comment]" : row.content,
    isDeleted: row.isDeleted,
    isPinned: row.isPinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      id: row.authorId,
      name: row.isDeleted ? "Deleted" : row.authorName,
      image: row.isDeleted ? null : row.authorImage,
      username: row.isDeleted ? "deleted" : row.authorUsername,
    },
    voteCount: Number(row.voteCount),
    userVote: row.userVote,
    replyCount: Number(row.replyCount),
    replies: [],
  };
}

function sortComments(items: CommentWithDetails[], sort: CommentSort): void {
  items.sort((a, b) => {
    // Pinned comments always stay at the top.
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    if (sort === "oldest") {
      return aTime - bTime;
    }
    if (sort === "liked") {
      const diff = b.voteCount - a.voteCount;
      if (diff !== 0) return diff;
    }
    return bTime - aTime;
  });
}

async function fetchCommentPage(
  postId: string,
  parentId: string | null,
  currentUserId: string | null | undefined,
  sort: CommentSort,
  limit: number,
  cursor?: string | null
): Promise<{ items: CommentWithDetails[]; nextCursor: string | null }> {
  const conditions: ReturnType<typeof and>[] = [eq(comments.postId, postId)];

  if (parentId === null) {
    conditions.push(isNull(comments.parentCommentId));
  } else {
    conditions.push(eq(comments.parentCommentId, parentId));
  }

  if (cursor) {
    const cursorData = JSON.parse(cursor) as {
      createdAt: number;
      voteCount: number;
      id: string;
      isPinned: boolean;
    };
    if (sort === "newest") {
      if (cursorData.isPinned) {
        conditions.push(
          sql`(comments.is_pinned = 1 AND comments.created_at < ${new Date(cursorData.createdAt)})
               OR comments.is_pinned = 0`
        );
      } else {
        conditions.push(
          sql`comments.is_pinned = 0 AND comments.created_at < ${new Date(cursorData.createdAt)}`
        );
      }
    } else if (sort === "oldest") {
      if (cursorData.isPinned) {
        conditions.push(
          sql`(comments.is_pinned = 1 AND comments.created_at > ${new Date(cursorData.createdAt)})
               OR comments.is_pinned = 0`
        );
      } else {
        conditions.push(
          sql`comments.is_pinned = 0 AND comments.created_at > ${new Date(cursorData.createdAt)}`
        );
      }
    } else if (sort === "liked") {
      const cursorComment = await db
        .select({ createdAt: comments.createdAt })
        .from(comments)
        .where(eq(comments.id, cursorData.id))
        .limit(1)
        .then((rows) => rows[0]);
      if (cursorComment) {
        conditions.push(
          sql`(${voteCountSql(comments.id)} < ${cursorData.voteCount}) OR (${voteCountSql(comments.id)} = ${cursorData.voteCount} AND comments.created_at < ${cursorComment.createdAt})`
        );
      }
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy: ReturnType<typeof desc> | ReturnType<typeof asc>;
  if (sort === "newest") {
    orderBy = desc(comments.createdAt);
  } else if (sort === "oldest") {
    orderBy = asc(comments.createdAt);
  } else {
    orderBy = desc(sql`${voteCountSql(comments.id)}`);
  }

  // Pinned comments stay at the top regardless of the selected sort.
  const pinnedFirst = sql`comments.is_pinned DESC`;

  const rows = await db
    .select(commentSelect(currentUserId))
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(whereClause)
    .orderBy(pinnedFirst, orderBy, desc(comments.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];
  const nextCursor =
    hasMore && lastItem
      ? JSON.stringify({
          createdAt: new Date(lastItem.createdAt).getTime(),
          voteCount: Number(lastItem.voteCount),
          id: lastItem.id,
          isPinned: Boolean(lastItem.isPinned),
        })
      : null;

  return {
    items: items.map((row) => mapCommentRow(row as unknown as CommentRow)),
    nextCursor,
  };
}

async function fetchChildren(
  postId: string,
  parentIds: string[],
  currentUserId: string | null | undefined
): Promise<CommentWithDetails[]> {
  if (parentIds.length === 0) return [];
  const rows = await db
    .select(commentSelect(currentUserId))
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(
      and(
        eq(comments.postId, postId),
        inArray(comments.parentCommentId, parentIds)
      )
    );
  return rows.map((row) => mapCommentRow(row as unknown as CommentRow));
}

// How many levels of replies are auto-loaded with the top-level listing.
// Deeper levels are loaded lazily via the "View more replies" interaction.
const MAX_AUTO_REPLY_DEPTH = 3;

async function attachReplies(
  items: CommentWithDetails[],
  postId: string,
  currentUserId: string | null | undefined,
  sort: CommentSort,
  depth = 0
): Promise<CommentWithDetails[]> {
  if (items.length === 0 || depth >= MAX_AUTO_REPLY_DEPTH) return items;

  const children = await fetchChildren(
    postId,
    items.map((c) => c.id),
    currentUserId
  );
  sortComments(children, sort);

  const childrenByParent = new Map<string, CommentWithDetails[]>();
  for (const child of children) {
    const parentId = child.parentCommentId!;
    const arr = childrenByParent.get(parentId) ?? [];
    arr.push(child);
    childrenByParent.set(parentId, arr);
  }

  for (const item of items) {
    const directChildren = childrenByParent.get(item.id) ?? [];
    item.replies = await attachReplies(
      directChildren,
      postId,
      currentUserId,
      sort,
      depth + 1
    );
  }

  return items;
}

export async function listComments(
  postId: string,
  parentId?: string | null,
  currentUserId?: string | null,
  sort: CommentSort = "newest",
  limit = 20,
  cursor?: string | null
): Promise<ListCommentsResult> {
  const result = await fetchCommentPage(
    postId,
    parentId ?? null,
    currentUserId,
    sort,
    limit,
    cursor
  );

  // Requests for a specific parent (used by "View more replies") return a flat
  // list of direct children; the top-level listing gets a nested tree built.
  if (parentId) {
    return result;
  }

  result.items = await attachReplies(result.items, postId, currentUserId, sort);
  return result;
}

export async function createComment(
  userId: string,
  data: CreateCommentInput
): Promise<CommentWithDetails> {
  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, data.postId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!post) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Post not found.",
    });
  }

  const membership = await checkMembership(userId, post.communityId);
  if (!membership.isMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a member of this community to comment.",
    });
  }

  if (data.parentCommentId) {
    const parentComment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, data.parentCommentId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!parentComment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Parent comment not found.",
      });
    }
    if (parentComment.postId !== data.postId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Parent comment does not belong to this post.",
      });
    }
  }

  const now = new Date();
  const [comment] = await db
    .insert(comments)
    .values({
      id: randomUUID(),
      postId: data.postId,
      authorId: userId,
      parentCommentId: data.parentCommentId ?? null,
      content: data.content,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

    // Award points for creating a comment
    try {
      await awardPoints({
        userId,
        communityId: post.communityId,
        actionType: "comment",
        targetId: comment.id,
        description: `Commented on post: ${post.id}`,
      });
    } catch (error) {
      console.error("Failed to award points for comment creation:", error);
    }

    // Check and award badges
    try {
      await checkAndAwardBadges(userId);
    } catch (error) {
      console.error("Failed to check and award badges for comment creation:", error);
    }

  // Store mentions
  const mentionedUsernames = extractMentions(data.content);
  const mentionedUserIds = await resolveMentionUserIds(
    post.communityId,
    mentionedUsernames
  );
  await storeMentions(mentionedUserIds, "comment", comment.id);

  if (mentionedUserIds.length > 0) {
    console.debug("Comment mentions resolved:", mentionedUserIds);
  }

  const author = await db
    .select({ id: users.id, name: users.name, image: users.image, username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0]);

  // Fire-and-forget notifications for this comment
  void triggerCommentNotifications(
    comment.id,
    comment.postId,
    post.communityId,
    userId,
    mentionedUserIds,
    comment.parentCommentId ?? null
  );

  return {
    ...comment,
    author,
    voteCount: 0,
    userVote: null,
    replyCount: 0,
    isDeleted: false,
    replies: [],
  };
}

// Add notification triggers after comment creation (separate helper to
// avoid blocking the main comment creation flow).
async function triggerCommentNotifications(
  commentId: string,
  postId: string,
  communityId: string,
  commenterId: string,
  mentionedUserIds: string[],
  parentCommentId?: string | null
): Promise<void> {
  try {
    const postRow = await db
      .select({ id: posts.id, authorId: posts.authorId })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)
      .then((r) => r[0]);

    const communityRow = await db
      .select({ slug: communities.slug })
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1)
      .then((r) => r[0]);

    const postLink = `/community/${communityRow?.slug ?? ""}/post/${postId}#comment-${commentId}`;

    // Notify post author about the new comment
    if (postRow && postRow.authorId && postRow.authorId !== commenterId) {
      await createNotification({
        userId: postRow.authorId,
        type: "comment",
        actorId: commenterId,
        targetType: "post",
        targetId: postId,
        message: `Someone commented on your post`,
        link: postLink,
      });
    }

    // If this is a reply, notify the parent comment author
    if (parentCommentId) {
      const parent = await db
        .select({ id: comments.id, authorId: comments.authorId })
        .from(comments)
        .where(eq(comments.id, parentCommentId))
        .limit(1)
        .then((r) => r[0]);

      if (parent && parent.authorId && parent.authorId !== commenterId && parent.authorId !== postRow?.authorId) {
        await createNotification({
          userId: parent.authorId,
          type: "reply",
          actorId: commenterId,
          targetType: "comment",
          // point reply notifications at the new reply so the recipient is taken
          // directly to the reply anchor instead of the parent comment
          targetId: commentId,
          message: `Someone replied to your comment`,
          link: postLink,
        });
      }
    }

    // Notify mentioned users (skip self)
    for (const mentionedUserId of mentionedUserIds) {
      if (!mentionedUserId || mentionedUserId === commenterId) continue;
      try {
        await createNotification({
          userId: mentionedUserId,
          type: "mention",
          actorId: commenterId,
          targetType: "comment",
          targetId: commentId,
          message: `Someone mentioned you in a comment`,
          link: postLink,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to create mention notification:", err);
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error triggering comment notifications:", err);
  }
}

export async function updateComment(
  userId: string,
  data: UpdateCommentInput
): Promise<CommentWithDetails> {
  const comment = await db
    .select()
    .from(comments)
    .where(eq(comments.id, data.commentId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!comment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Comment not found.",
    });
  }

  if (comment.authorId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only edit your own comments.",
    });
  }

  const [updated] = await db
    .update(comments)
    .set({
      content: data.content,
      updatedAt: new Date(),
    })
    .where(eq(comments.id, data.commentId))
    .returning();

  const author = await db
    .select({ id: users.id, name: users.name, image: users.image, username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0]);

  const voteCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(votes)
    .where(and(eq(votes.targetId, data.commentId), eq(votes.targetType, "comment")))
    .then((rows) => Number(rows[0]?.count ?? 0));

  const userVote = await db
    .select({ value: votes.value })
    .from(votes)
    .where(and(eq(votes.targetId, data.commentId), eq(votes.targetType, "comment"), eq(votes.userId, userId)))
    .limit(1)
    .then((rows) => rows[0]?.value ?? null);

  const replyCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(comments)
    .where(eq(comments.parentCommentId, data.commentId))
    .then((rows) => Number(rows[0]?.count ?? 0));

  return {
    ...updated,
    author,
    voteCount,
    userVote,
    replyCount,
    isDeleted: updated.isDeleted,
    replies: [],
  };
}

export async function deleteComment(
  userId: string,
  commentId: string
): Promise<void> {
  const comment = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!comment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Comment not found.",
    });
  }

  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, comment.postId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!post) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Associated post not found.",
    });
  }

  const membership = await checkMembership(userId, post.communityId);
  const isAuthor = comment.authorId === userId;
  const isModerator = membership.isAdmin || membership.isOwner || membership.isModerator;

  if (!isAuthor && !isModerator) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to delete this comment.",
    });
  }

  // If the comment has replies, soft-delete to preserve thread context
  const replyCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(comments)
    .where(eq(comments.parentCommentId, commentId))
    .then((rows) => Number(rows[0]?.count ?? 0));

  if (replyCount > 0) {
    await db
      .update(comments)
      .set({ content: "", isDeleted: true, updatedAt: new Date() })
      .where(eq(comments.id, commentId));
  } else {
    await db.delete(comments).where(eq(comments.id, commentId));
  }
}

export async function togglePinPost(userId: string, postId: string): Promise<{ isPinned: boolean }> {
  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!post) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Post not found.",
    });
  }

  // Only the community owner, admins, and moderators can pin/unpin posts.
  const membership = await checkMembership(userId, post.communityId);
  const isModerator = membership.isOwner || membership.isAdmin || membership.isModerator;
  if (!isModerator) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only moderators can pin posts.",
    });
  }

  const [updated] = await db
    .update(posts)
    .set({ isPinned: !post.isPinned, updatedAt: new Date() })
    .where(eq(posts.id, postId))
    .returning({ isPinned: posts.isPinned });

  return { isPinned: updated.isPinned };
}

export async function togglePinComment(userId: string, commentId: string): Promise<{ isPinned: boolean }> {
  const comment = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!comment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Comment not found.",
    });
  }

  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, comment.postId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!post) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Associated post not found.",
    });
  }

  // Only moderators (owner/admin/moderator) or the post author can pin comments.
  const membership = await checkMembership(userId, post.communityId);
  const isPostAuthor = post.authorId === userId;
  const isModerator = membership.isOwner || membership.isAdmin || membership.isModerator;

  if (!isModerator && !isPostAuthor) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only moderators or the post author can pin comments.",
    });
  }

  const [updated] = await db
    .update(comments)
    .set({ isPinned: !comment.isPinned, updatedAt: new Date() })
    .where(eq(comments.id, commentId))
    .returning({ isPinned: comments.isPinned });

  return { isPinned: updated.isPinned };
}

// ---------- Votes ----------

export async function toggleVote(
  userId: string,
  data: ToggleVoteInput
): Promise<{ voteCount: number; userVote: number | null }> {
  let targetCommunityId: string | null = null;

  if (data.targetType === "post") {
    const post = await db
      .select({ communityId: posts.communityId })
      .from(posts)
      .where(eq(posts.id, data.targetId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!post) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Post not found.",
      });
    }
    targetCommunityId = post.communityId;
  } else {
    const comment = await db
      .select({ postId: comments.postId })
      .from(comments)
      .where(eq(comments.id, data.targetId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!comment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Comment not found.",
      });
    }

    const post = await db
      .select({ communityId: posts.communityId })
      .from(posts)
      .where(eq(posts.id, comment.postId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!post) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Associated post not found.",
      });
    }
    targetCommunityId = post.communityId;
  }

  const membership = await checkMembership(userId, targetCommunityId);
  if (!membership.isMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a member of this community to vote.",
    });
  }

  const existingVote = await db
    .select()
    .from(votes)
    .where(
      and(
        eq(votes.userId, userId),
        eq(votes.targetId, data.targetId),
        eq(votes.targetType, data.targetType)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (existingVote) {
    await db.delete(votes).where(eq(votes.id, existingVote.id));
  } else {
    await db.insert(votes).values({
      id: randomUUID(),
      userId,
      targetType: data.targetType,
      targetId: data.targetId,
      value: 1,
      createdAt: new Date(),
    });
      //  Award points for receiving and giving a like
      try {
        let targetAuthorId: string | null = null;
        let communityId: string | null = null;

        if (data.targetType === "post") {
          const post = await db
            .select({ authorId: posts.authorId, communityId: posts.communityId })
            .from(posts)
            .where(eq(posts.id, data.targetId))
            .limit(1)
            .then((r) => r[0]);
          if (post) {
            targetAuthorId = post.authorId;
            communityId = post.communityId;
          }
        } else {
          const comment = await db
            .select({ authorId: comments.authorId, postId: comments.postId })
            .from(comments)
            .where(eq(comments.id, data.targetId))
            .limit(1)
            .then((r) => r[0]);
          if (comment) {
            targetAuthorId = comment.authorId;
            const post = await db
              .select({ communityId: posts.communityId })
              .from(posts)
              .where(eq(posts.id, comment.postId))
              .limit(1)
              .then((r) => r[0]);
            communityId = post?.communityId ?? null;
          }
        }

        if (communityId && targetAuthorId && targetAuthorId !== userId) {
          // Award points to the target author for receiving a like
          await awardPoints({
            userId: targetAuthorId,
            communityId,
            actionType: "like_received",
            targetId: data.targetId,
            description: `Received a like on ${data.targetType}: ${data.targetId}`,
          });

          // Award points to the voter for giving a like
          await awardPoints({
            userId,
            communityId,
            actionType: "like_given",
            targetId: data.targetId,
            description: `Liked ${data.targetType}: ${data.targetId}`,
          });
        }
      } catch (error) {
        console.error("Failed to award points for like:", error);
      }

      // Check and award badges for the target author
      try {
        let targetAuthorId: string | null = null;

        if (data.targetType === "post") {
          const post = await db
            .select({ authorId: posts.authorId })
            .from(posts)
            .where(eq(posts.id, data.targetId))
            .limit(1)
            .then((r) => r[0]);
          if (post) {
            targetAuthorId = post.authorId;
          }
        } else {
          const comment = await db
            .select({ authorId: comments.authorId })
            .from(comments)
            .where(eq(comments.id, data.targetId))
            .limit(1)
            .then((r) => r[0]);
          if (comment) {
            targetAuthorId = comment.authorId;
          }
        }

        if (targetAuthorId && targetAuthorId !== userId) {
          await checkAndAwardBadges(targetAuthorId);
        }
      } catch (error) {
        console.error("Failed to check and award badges after like:", error);
      }

    // Fire-and-forget: create a 'like' notification for the target owner
    void (async () => {
      try {
        let targetAuthorId: string | null = null;
        let link = "/";

        if (data.targetType === "post") {
          const postRow = await db
            .select({ authorId: posts.authorId, communityId: posts.communityId })
            .from(posts)
            .where(eq(posts.id, data.targetId))
            .limit(1)
            .then((r) => r[0]);
          if (postRow) {
            targetAuthorId = postRow.authorId;
            const communityRow = await db
              .select({ slug: communities.slug })
              .from(communities)
              .where(eq(communities.id, postRow.communityId))
              .limit(1)
              .then((r) => r[0]);
            link = `/community/${communityRow?.slug ?? ""}/post/${data.targetId}`;
          }
        } else {
          const commentRow = await db
            .select({ authorId: comments.authorId, postId: comments.postId })
            .from(comments)
            .where(eq(comments.id, data.targetId))
            .limit(1)
            .then((r) => r[0]);
            if (commentRow) {
            targetAuthorId = commentRow.authorId;
            const communityRow = await db
              .select({ slug: communities.slug })
              .from(posts)
              .innerJoin(communities, eq(communities.id, posts.communityId))
              .where(eq(posts.id, commentRow.postId))
              .limit(1)
              .then((r) => r[0]);
            link = `/community/${communityRow?.slug ?? ""}/post/${commentRow.postId}#comment-${data.targetId}`;
          }
        }

        if (targetAuthorId && targetAuthorId !== userId) {
          await createNotification({
            userId: targetAuthorId,
            type: "like",
            actorId: userId,
            targetType: data.targetType === "post" ? "post" : "comment",
            targetId: data.targetId,
            message: `Someone liked your ${data.targetType}`,
            link,
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to create like notification:", err);
      }
    })();
  }

  const voteCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(votes)
    .where(
      and(
        eq(votes.targetId, data.targetId),
        eq(votes.targetType, data.targetType)
      )
    )
    .then((rows) => Number(rows[0]?.count ?? 0));

  const newUserVote = existingVote ? null : 1;

  return { voteCount, userVote: newUserVote };
}

// ---------- Reports ----------

export async function createReport(
  userId: string,
  data: CreateReportInput
): Promise<Report> {
  // Verify the target exists
  if (data.targetType === "post") {
    const post = await db
      .select()
      .from(posts)
      .where(eq(posts.id, data.targetId))
      .limit(1)
      .then((rows) => rows[0]);
    if (!post) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Post not found.",
      });
    }
  } else {
    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, data.targetId))
      .limit(1)
      .then((rows) => rows[0]);
    if (!comment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Comment not found.",
      });
    }
  }

  const [report] = await db
    .insert(reports)
    .values({
      id: randomUUID(),
      reporterId: userId,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
      status: "pending",
      createdAt: new Date(),
    })
    .returning();

  return report;
}

// ---------- Bookmarks ----------

export async function toggleBookmark(
  userId: string,
  postId: string
): Promise<ToggleBookmarkResult> {
  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!post) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Post not found.",
    });
  }

  const existing = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)))
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
  } else {
    await db.insert(bookmarks).values({
      id: randomUUID(),
      userId,
      postId,
      createdAt: new Date(),
    });
  }

  const bookmarkCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(bookmarks)
    .where(eq(bookmarks.postId, postId))
    .then((rows) => Number(rows[0]?.count ?? 0));

  return { isBookmarked: !existing, bookmarkCount };
}

export async function listBookmarks(
  userId: string
): Promise<{ postIds: string[] }> {
  const rows = await db
    .select({ postId: bookmarks.postId })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt));

  return { postIds: rows.map((r) => r.postId) };
}


