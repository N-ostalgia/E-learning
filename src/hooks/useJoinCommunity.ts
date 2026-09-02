"use client";

import { trpc } from "@/lib/trpc/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UseJoinCommunityReturn {
  join: (communityId: string) => void;
  leave: (communityId: string) => void;
  isJoining: boolean;
  isLeaving: boolean;
  error: string | null;
}

const DEFAULT_LIST_PARAMS = { limit: 12, search: null as string | null, category: null as string | null };

export function useJoinCommunity(
  listParams?: { limit?: number; search?: string | null; category?: string | null }
): UseJoinCommunityReturn {
  const utils = trpc.useUtils();
  const [error, setError] = useState<string | null>(null);
  const params = { ...DEFAULT_LIST_PARAMS, ...listParams };

  const joinMutation = trpc.community.join.useMutation({
    onMutate: async ({ communityId }) => {
      await utils.community.list.cancel();
      const previousData = utils.community.list.getInfiniteData(params);
      utils.community.list.setInfiniteData(params, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === communityId
                ? { ...item, isMember: true, membershipStatus: "active" }
                : item
            ),
          })),
        };
      });
      return { previousData };
    },
    onSuccess: (data) => {
      utils.community.list.invalidate();
      utils.community.myCommunities.invalidate();
      utils.community.getBySlug.invalidate();
      setError(null);
      if (data.status === "pending") {
        toast.success("Membership request sent! Waiting for approval.");
      } else {
        toast.success("Successfully joined the community!");
      }
    },
    onError: (err, _vars, context) => {
      if (context?.previousData) {
        utils.community.list.setInfiniteData(params, context.previousData);
      }
      setError(err.message);
      toast.error(err.message || "Failed to join community.");
    },
  });

  const leaveMutation = trpc.community.leave.useMutation({
    onMutate: async ({ communityId }) => {
      await utils.community.list.cancel();
      const previousData = utils.community.list.getInfiniteData(params);
      utils.community.list.setInfiniteData(params, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === communityId
                ? { ...item, isMember: false, membershipStatus: null, memberRole: null }
                : item
            ),
          })),
        };
      });
      return { previousData };
    },
    onSuccess: () => {
      utils.community.list.invalidate();
      utils.community.myCommunities.invalidate();
      utils.community.getBySlug.invalidate();
      setError(null);
      toast.success("Left the community.");
    },
    onError: (err, _vars, context) => {
      if (context?.previousData) {
        utils.community.list.setInfiniteData(params, context.previousData);
      }
      setError(err.message);
      toast.error(err.message || "Failed to leave community.");
    },
  });

  const join = useCallback(
    (communityId: string) => {
      joinMutation.mutate({ communityId });
    },
    [joinMutation]
  );

  const leave = useCallback(
    (communityId: string) => {
      leaveMutation.mutate({ communityId });
    },
    [leaveMutation]
  );

  return {
    join,
    leave,
    isJoining: joinMutation.isPending,
    isLeaving: leaveMutation.isPending,
    error,
  };
}