"use client";

import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

interface CreatePostVariables {
  communityId: string;
  title?: string;
  content: string;
  type?: "post" | "announcement" | "question";
}

interface UpdatePostVariables {
  postId: string;
  title?: string;
  content: string;
  type?: "post" | "announcement" | "question";
}

export function usePost() {
  const utils = trpc.useUtils();

  const createMutation = trpc.feed.create.useMutation({
    onMutate: async (variables: CreatePostVariables) => {
      await utils.feed.list.cancel();
      const previousData = utils.feed.list.getInfiniteData();
      return { previousData };
    },
    onSuccess: () => {
      utils.feed.list.invalidate();
      toast.success("Post created successfully! (+10 points)");
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        utils.feed.list.setInfiniteData({}, context.previousData);
      }
      toast.error(err.message || "Failed to create post.");
    },
  });

  const updateMutation = trpc.feed.update.useMutation({
    onSuccess: () => {
      utils.feed.list.invalidate();
      toast.success("Post updated successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update post.");
    },
  });

  const deleteMutation = trpc.feed.delete.useMutation({
    onMutate: async ({ postId }) => {
      await utils.feed.list.cancel();
      const previousData = utils.feed.list.getInfiniteData();
      utils.feed.list.setInfiniteData({}, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.id !== postId),
          })),
        };
      });
      return { previousData };
    },
    onSuccess: () => {
      utils.feed.list.invalidate();
      toast.success("Post deleted.");
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        utils.feed.list.setInfiniteData({}, context.previousData);
      }
      toast.error(err.message || "Failed to delete post.");
    },
  });

  return {
    createPost: createMutation.mutate,
    isCreating: createMutation.isPending,
    updatePost: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deletePost: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}

