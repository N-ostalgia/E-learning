"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComment,
  faEllipsisV,
  faPen,
  faTrash,
  faXmark,
  faFlag,
  faThumbtack,
  faBookmark as faBookmarkSolid,
} from "@fortawesome/free-solid-svg-icons";
import { faBookmark as faBookmarkRegular } from "@fortawesome/free-regular-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import type { PostWithDetails, CommentSort } from "@/server/modules/feed/feed.types";
import { VoteButton } from "./VoteButton";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import { MentionText } from "./MentionText";
import { ReportModal } from "./ReportModal";
import { PostForm } from "./PostForm";
import { usePost } from "@/hooks/usePost";
import { useBookmark } from "@/hooks/useBookmark";

interface PostCardProps {
  post: PostWithDetails;
  currentUserId?: string | null;
  isAdmin?: boolean;
  isOwner?: boolean;
  isModerator?: boolean;
}

// Post type is expressed as a verb phrase inside the header sentence
// ("asked a question in payed1") instead of a separate colored badge.
const TYPE_ACTION: Record<string, string> = {
  announcement: "posted an announcement in",
  question: "asked a question in",
  post: "posted in",
};

const COMMENT_SORTS: { value: CommentSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "liked", label: "Most liked" },
];

function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Avatar with the community as a small badge on its corner — the
// combo-avatar treatment.
function Avatar({
  name,
  image,
  community,
}: {
  name: string;
  image?: string | null;
  community?: { name: string; avatarUrl?: string | null } | null;
}) {
  return (
    <div className="relative flex-shrink-0">
      {image ? (
        <img
          src={image}
          alt={name}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white">
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {community && (
        <div className="absolute -bottom-1 -right-1 h-4.5 w-4.5 overflow-hidden rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-accent)]">
          {community.avatarUrl ? (
            <img
              src={community.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[8px] font-bold text-white">
              {community.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PostCard({
  post,
  currentUserId,
  isAdmin = false,
  isOwner = false,
  isModerator = false,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [commentSort, setCommentSort] = useState<CommentSort>("newest");
  const { deletePost, isDeleting } = usePost();
  const { toggleBookmark, isToggling } = useBookmark();
  const utils = trpc.useUtils();

  const {
    data: commentsData,
    isLoading: commentsLoading,
    isFetchingNextPage: commentsFetchingMore,
    fetchNextPage: fetchMoreComments,
    hasNextPage: hasMoreComments,
  } = trpc.feed.getComments.useInfiniteQuery(
    { postId: post.id, sort: commentSort, limit: 20 },
    {
      enabled: showComments,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialCursor: undefined,
    }
  );

  const comments = useMemo(
    () => commentsData?.pages.flatMap((page) => page.items) ?? [],
    [commentsData]
  );

  // If the URL includes a comment anchor, open comments and remember the target id
  const initialHashRef = useRef<string | null>(null);
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const h = window.location.hash;
      if (h && h.startsWith("#comment-")) {
        initialHashRef.current = h.replace("#", "");
        setShowComments(true);
      }
    } catch (err) {
      /* ignore */
    }
  }, []);

  // After comments load, if an initial hash target exists, scroll to and highlight it.
  useEffect(() => {
    if (!initialHashRef.current) return;
    const id = initialHashRef.current;
    const timer = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("border-2", "border-emerald-500", "rounded-xl", "bg-emerald-50/50");
        setTimeout(() => {
          el.classList.remove("border-2", "border-emerald-500", "rounded-xl", "bg-emerald-50/50");
        }, 3000);
        initialHashRef.current = null;
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [comments]);

  const createCommentMutation = trpc.feed.createComment.useMutation({
    onSuccess: () => {
      utils.feed.getComments.invalidate({ postId: post.id });
      utils.feed.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add comment.");
    },
  });

  const isAuthor = post.authorId === currentUserId;
  const isCommunityOwner = post.community?.ownerId === currentUserId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isCommunityOwner || isAdmin || isOwner || isModerator;
  // Admins/moderators have the same power as the community owner for pinning posts.
  const canPin = isCommunityOwner || isAdmin || isOwner || isModerator;
  const actionPhrase = TYPE_ACTION[post.type] ?? TYPE_ACTION.post;

  const togglePinMutation = trpc.feed.togglePin.useMutation({
    onSuccess: () => {
      utils.feed.list.invalidate();
      toast.success(post.isPinned ? "Post unpinned." : "Post pinned!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update pin.");
    },
  });

  const handleDelete = () => {
    if (confirm("Delete this post? This will also delete all comments.")) {
      deletePost({ postId: post.id });
    }
  };

  const handlePinToggle = () => {
    togglePinMutation.mutate({ postId: post.id });
  };

  const handleBookmarkToggle = () => {
    toggleBookmark(
      { postId: post.id },
      {
        onError: (err) => {
          toast.error(err.message || "Failed to update bookmark.");
        },
      }
    );
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar
            name={post.author.name}
            image={post.author.image}
            community={post.community}
          />

          <div className="min-w-0">
            {/* Header reads as one sentence: who, what kind of post, where. */}
            <div className="text-sm leading-snug">
              <span className="font-semibold text-[var(--color-text-primary)]">
                {post.author.name}
              </span>
              {post.community && (
                <>
                  <span className="text-[var(--color-text-secondary)]"> {actionPhrase} </span>
                  <Link
                    href={`/community/${post.community.slug}`}
                    className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] hover:underline"
                  >
                    {post.community.name}
                  </Link>
                </>
              )}
              {post.isPinned && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 align-middle text-xs font-medium text-slate-600">
                  <FontAwesomeIcon icon={faThumbtack} className="h-3 w-3 text-current" />
                  Pinned
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              {formatDate(post.createdAt)} · @{post.author.username}
            </div>
          </div>
        </div>

        {currentUserId && (
          <div className="relative">
            <button
              onClick={() => setShowMenu((s) => !s)}
              className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
              aria-label="Post actions"
            >
              <FontAwesomeIcon icon={faEllipsisV} className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowEditModal(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
                    >
                      <FontAwesomeIcon icon={faPen} className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleDelete();
                      }}
                      disabled={isDeleting}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                  {canPin && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handlePinToggle();
                      }}
                      disabled={togglePinMutation.isPending}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] disabled:opacity-50"
                    >
                      <FontAwesomeIcon icon={faThumbtack} className="h-4 w-4" />
                      {post.isPinned ? "Unpin" : "Pin"}
                    </button>
                  )}
                  {!isAuthor && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowReport(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
                    >
                      <FontAwesomeIcon icon={faFlag} className="h-4 w-4" />
                      Report
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {post.title && (
        <h3 className="mt-3 font-display text-lg font-semibold text-[var(--color-text-primary)]">
          {post.title}
        </h3>
      )}
      <MentionText
        text={post.content}
        className="mt-1 block whitespace-pre-wrap text-[var(--color-text-primary)]"
      />

      <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
        <VoteButton
          targetId={post.id}
          targetType="post"
          voteCount={post.voteCount}
          userVote={post.userVote}
        />
        <button
          onClick={() => setShowComments((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)]"
        >
          <FontAwesomeIcon icon={faComment} className="h-4 w-4 text-current" />
          <span>{post.commentCount}</span>
        </button>

        {currentUserId && (
          <button
            onClick={handleBookmarkToggle}
            disabled={isToggling}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              post.isBookmarked
                ? "text-amber-600 hover:bg-amber-50"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-amber-600"
            }`}
            aria-label={post.isBookmarked ? "Remove bookmark" : "Save post"}
            title={post.isBookmarked ? "Saved" : "Save for later"}
          >
            <FontAwesomeIcon
              icon={post.isBookmarked ? faBookmarkSolid : faBookmarkRegular}
              className="h-4 w-4 text-current"
            />
            <span>{post.bookmarkCount}</span>
          </button>
        )}
      </div>

      {showComments && (
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <CommentForm
            onSubmit={(content) => {
              createCommentMutation.mutate({ postId: post.id, content });
            }}
            isSubmitting={createCommentMutation.isPending}
            communityId={post.communityId}
            placeholder="Write a comment..."
            autoFocus
          />

          <div className="mb-2 mt-3 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              {comments.length} comment{comments.length !== 1 ? "s" : ""}
            </span>
            <select
              value={commentSort}
              onChange={(e) => setCommentSort(e.target.value as CommentSort)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
              aria-label="Sort comments"
            >
              {COMMENT_SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {commentsLoading && (
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-12 animate-pulse rounded bg-[var(--color-border)]" />
            </div>
          )}

          {!commentsLoading && comments.length === 0 && (
            <p className="py-3 text-sm text-[var(--color-text-secondary)]">
              No comments yet. Be the first to comment!
            </p>
          )}

          <div className="space-y-1">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                isOwner={isOwner}
                isModerator={isModerator}
                postAuthorId={post.authorId}
                communityId={post.communityId}
              />
            ))}
          </div>

          {hasMoreComments && (
            <button
              onClick={() => fetchMoreComments()}
              disabled={commentsFetchingMore}
              className="mx-auto mt-3 block text-sm font-medium text-[var(--color-accent)] hover:underline disabled:opacity-50"
            >
              {commentsFetchingMore ? "Loading more..." : "Load more comments"}
            </button>
          )}
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-[var(--color-surface)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Edit Post
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                aria-label="Close edit modal"
              >
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>
            <PostForm
              editMode
              initialData={{
                id: post.id,
                title: post.title ?? undefined,
                content: post.content,
                type: post.type,
              }}
              communityId={post.communityId}
              onSuccess={() => {
                setShowEditModal(false);
                utils.feed.list.invalidate();
              }}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      )}

      {showReport && (
        <ReportModal
          targetId={post.id}
          targetType="post"
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}