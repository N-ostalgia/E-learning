"use client";

import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import type { PostWithDetails, CommentWithDetails } from "@/server/modules/feed/feed.types";

interface ToggleVoteInput {
  targetId: string;
  targetType: "post" | "comment";
}

function updateVoteInData<T extends PostWithDetails | CommentWithDetails>(data: T, targetId: string, targetType: string, result: { voteCount: number; userVote: number | null }): T {
  const isPostTarget = targetType === "post";
  if (isPostTarget && "communityId" in data) {
    const post = data as PostWithDetails;
    if (post.id === targetId) {
      return {
        ...post,
        voteCount: result.voteCount,
        userVote: result.userVote,
      } as T;
    }
  } else if ("postId" in data) {
    const comment = data as CommentWithDetails;
    if (comment.id === targetId) {
      return {
        ...comment,
        voteCount: result.voteCount,
        userVote: result.userVote,
      } as T;
    }
    if (comment.replies) {
      return {
        ...comment,
        replies: comment.replies.map((reply) => updateVoteInData(reply, targetId, targetType, result)),
      } as T;
    }
  }
  return data;
}

export function useVote() {
  const utils = trpc.useUtils();

  const toggleMutation = trpc.feed.toggleVote.useMutation({
    onMutate: async (variables: ToggleVoteInput) => {
      await utils.feed.list.cancel();
      const previousData = utils.feed.list.getInfiniteData();

      // Optimistically update the vote in the feed list cache
      utils.feed.list.setInfiniteData({}, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === variables.targetId && variables.targetType === "post"
                ? {
                    ...item,
                    voteCount: (item.userVote ? item.voteCount - 1 : item.voteCount + 1),
                    userVote: item.userVote ? null : 1,
                  }
                : item
            ),
          })),
        };
      });

      return { previousData };
    },
    onSuccess: () => {
      utils.feed.list.invalidate();
      utils.feed.getComments.invalidate();
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        utils.feed.list.setInfiniteData({}, context.previousData);
      }
      toast.error(err.message || "Failed to update vote.");
    },
  });

  return {
    toggleVote: toggleMutation.mutate,
    isVoting: toggleMutation.isPending,
  };
}

