"use client";

import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

export function useComment() {
  const utils = trpc.useUtils();

  const createMutation = trpc.feed.createComment.useMutation({
    onSuccess: () => {
      utils.feed.getComments.invalidate();
      utils.feed.list.invalidate();
      toast.success("Comment added! (+5 points)");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add comment.");
    },
  });

  const updateMutation = trpc.feed.updateComment.useMutation({
    onSuccess: () => {
      utils.feed.getComments.invalidate();
      toast.success("Comment updated.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update comment.");
    },
  });

  const deleteMutation = trpc.feed.deleteComment.useMutation({
    onSuccess: () => {
      utils.feed.getComments.invalidate();
      utils.feed.list.invalidate();
      toast.success("Comment deleted.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete comment.");
    },
  });

  return {
    createComment: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateComment: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteComment: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}

