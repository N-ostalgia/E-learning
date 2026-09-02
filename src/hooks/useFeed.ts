"use client";

import { trpc } from "@/lib/trpc/react";

export function useFeed(communityId?: string, savedOnly = false) {
  const feedQuery = trpc.feed.list.useInfiniteQuery(
    { communityId, limit: 20, savedOnly },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialCursor: undefined,
    }
  );

  const posts = feedQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    posts,
    isLoading: feedQuery.isLoading,
    isFetchingNextPage: feedQuery.isFetchingNextPage,
    hasNextPage: feedQuery.hasNextPage,
    fetchNextPage: feedQuery.fetchNextPage,
    refetch: feedQuery.refetch,
  };
}

