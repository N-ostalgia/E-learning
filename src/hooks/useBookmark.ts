"use client";

import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

export function useBookmark() {
  const utils = trpc.useUtils();

  const toggleMutation = trpc.feed.toggleBookmark.useMutation({
    onMutate: async ({ postId }) => {
      // Cancel any in-flight feed queries so they don't overwrite the optimistic update.
      await utils.feed.list.cancel();

      const previousFeed = utils.feed.list.getInfiniteData();

      // Optimistically update the bookmark state/count in the feed cache.
      utils.feed.list.setInfiniteData({}, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === postId
                ? {
                    ...item,
                    isBookmarked: !item.isBookmarked,
                    bookmarkCount: item.isBookmarked
                      ? Math.max(item.bookmarkCount - 1, 0)
                      : item.bookmarkCount + 1,
                  }
                : item
            ),
          })),
        };
      });

      return { previousFeed };
    },
    onSuccess: (data, variables) => {
      utils.feed.list.invalidate();
      toast.success(
        data.isBookmarked ? "Post saved." : "Removed from saved posts."
      );
    },
    onError: (err, _variables, context) => {
      if (context?.previousFeed) {
        utils.feed.list.setInfiniteData({}, context.previousFeed);
      }
      toast.error(err.message || "Failed to update bookmark.");
    },
  });

  const listQuery = trpc.feed.listBookmarks.useQuery(undefined, {
    enabled: false,
  });

  return {
    toggleBookmark: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
    bookmarks: listQuery.data,
    refetchBookmarks: listQuery.refetch,
  };
}

