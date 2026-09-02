"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsisV,
  faPen,
  faTrash,
  faFlag,
  faThumbtack,
} from "@fortawesome/free-solid-svg-icons";
import type { CommentWithDetails } from "@/server/modules/feed/feed.types";
import { CommentForm } from "./CommentForm";
import { VoteButton } from "./VoteButton";
import { MentionText } from "./MentionText";
import { ReportModal } from "./ReportModal";
import { useComment } from "@/hooks/useComment";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

interface CommentItemProps {
  comment: CommentWithDetails;
  currentUserId?: string | null;
  isAdmin?: boolean;
  isOwner?: boolean;
  isModerator?: boolean;
  postAuthorId?: string;
  communityId?: string;
  depth?: number;
}

function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Avatar({ name, image }: { name: string; image?: string | null }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const MAX_RENDER_DEPTH = 4;

export function CommentItem({
  comment,
  currentUserId,
  isAdmin = false,
  isOwner = false,
  isModerator = false,
  postAuthorId,
  communityId,
  depth = 0,
}: CommentItemProps) {
  const [showReply, setShowReply] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState(false);
  const { createComment, isCreating, updateComment, isUpdating, deleteComment, isDeleting } =
    useComment();

  // Fetch additional replies lazily when "View more replies" is clicked.
  const repliesQuery = trpc.feed.getComments.useQuery(
    { postId: comment.postId, parentId: comment.id, sort: "newest", limit: 20 },
    { enabled: expandedReplies && comment.replyCount > comment.replies.length }
  );

  const handleReply = (content: string) => {
    createComment({
      postId: comment.postId,
      content,
      parentCommentId: comment.id,
    });
    setShowReply(false);
  };

  const handleEdit = (content: string) => {
    updateComment({ commentId: comment.id, content });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm("Delete this comment?")) {
      deleteComment({ commentId: comment.id });
    }
  };

  const isAuthor = comment.authorId === currentUserId;
  const canEdit = isAuthor && !comment.isDeleted;
  const canDelete =
    !comment.isDeleted &&
    (isAuthor || isAdmin || isOwner || isModerator);
  // Admins/moderators have the same power as the community owner. The post
  // author can also pin comments; the comment author cannot (unless they also
  // own the post or are a moderator).
  const canPin =
    isAdmin || isOwner || isModerator || postAuthorId === currentUserId;
  const remainingReplies = Math.max(comment.replyCount - comment.replies.length, 0);
  const indentation = depth > 0 ? "ml-10 border-l-2 border-[var(--color-border)] pl-4" : "";

  const utils = trpc.useUtils();
  const togglePinCommentMutation = trpc.feed.togglePinComment.useMutation({
    onSuccess: () => {
      utils.feed.getComments.invalidate();
      toast.success(comment.isPinned ? "Comment unpinned." : "Comment pinned!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update pin.");
    },
  });

  // Dedupe the lazily-fetched children against ones already loaded in the tree.
  const loadedReplyIds = new Set(comment.replies.map((r) => r.id));
  const extraReplies = expandedReplies
    ? (repliesQuery.data?.items ?? []).filter((r) => !loadedReplyIds.has(r.id))
    : [];

  return (
    <div id={`comment-${comment.id}`} className={indentation}>
      <div className="mt-3">
        <div className="flex items-start gap-2.5">
          <Avatar name={comment.author.name} image={comment.author.image} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {comment.author.name}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {formatDate(comment.createdAt)}
              </span>
            </div>

            {isEditing ? (
              <div className="mt-1">
                <CommentForm
                  onSubmit={handleEdit}
                  onCancel={() => setIsEditing(false)}
                  isSubmitting={isUpdating}
                  placeholder="Edit your comment..."
                  submitLabel="Save"
                  initialValue={comment.content}
                  communityId={communityId}
                  autoFocus
                />
              </div>
            ) : comment.isDeleted ? (
              <p className="mt-0.5 text-sm italic text-[var(--color-text-secondary)]">
                [deleted comment]
              </p>
            ) : (
              <MentionText
                text={comment.content}
                className="mt-0.5 block text-sm text-[var(--color-text-primary)]"
              />
            )}

            {!comment.isDeleted && (
              <div className="mt-1.5 flex items-center gap-1">
                <VoteButton
                  targetId={comment.id}
                  targetType="comment"
                  voteCount={comment.voteCount}
                  userVote={comment.userVote}
                />
                <button
                  onClick={() => setShowReply((s) => !s)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
                >
                  Reply
                </button>

{currentUserId && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu((s) => !s)}
                      className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
                      aria-label="Comment actions"
                    >
                      <FontAwesomeIcon icon={faEllipsisV} className="h-3 w-3" />
                    </button>

                    {showMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowMenu(false)}
                        />
                        <div className="absolute left-0 top-full z-20 mt-1 min-w-[150px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
                          {canEdit && (
                            <button
                              onClick={() => {
                                setShowMenu(false);
                                setIsEditing(true);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
                            >
                              <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
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
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                          {canPin && (
                            <button
                              onClick={() => {
                                setShowMenu(false);
                                togglePinCommentMutation.mutate({ commentId: comment.id });
                              }}
                              disabled={togglePinCommentMutation.isPending}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] disabled:opacity-50"
                            >
                              <FontAwesomeIcon icon={faThumbtack} className="h-3.5 w-3.5" />
                              {comment.isPinned ? "Unpin" : "Pin"}
                            </button>
                          )}
                          {!isAuthor && (
                            <button
                              onClick={() => {
                                setShowMenu(false);
                                setShowReport(true);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
                            >
                              <FontAwesomeIcon icon={faFlag} className="h-3.5 w-3.5" />
                              Report
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {showReply && (
              <div className="mt-2">
                <CommentForm
                  onSubmit={handleReply}
                  onCancel={() => setShowReply(false)}
                  isSubmitting={isCreating}
                  placeholder="Write a reply..."
                  submitLabel="Reply"
                  communityId={communityId}
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {(comment.replies.length > 0 || extraReplies.length > 0) &&
          depth < MAX_RENDER_DEPTH && (
            <div>
              {[...comment.replies, ...extraReplies].map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  isOwner={isOwner}
                  isModerator={isModerator}
                  postAuthorId={postAuthorId}
                  communityId={communityId}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}

        {remainingReplies > 0 && depth < MAX_RENDER_DEPTH && (
          <button
            onClick={() => setExpandedReplies((s) => !s)}
            disabled={repliesQuery.isLoading}
            className="ml-10 mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline disabled:opacity-50"
          >
            {expandedReplies
              ? repliesQuery.isLoading
                ? "Loading replies..."
                : "Hide replies"
              : `View ${remainingReplies} more repl${remainingReplies === 1 ? "y" : "ies"}`}
          </button>
        )}
      </div>

      {showReport && (
        <ReportModal
          targetId={comment.id}
          targetType="comment"
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

