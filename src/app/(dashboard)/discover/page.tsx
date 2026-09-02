"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { CommunityList } from "@/components/features/community/CommunityList";
import { useJoinCommunity } from "@/hooks/useJoinCommunity";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "tech", label: "Tech" },
  { value: "design", label: "Design" },
  { value: "business", label: "Business" },
  { value: "science", label: "Science" },
  { value: "arts", label: "Arts" },
  { value: "music", label: "Music" },
  { value: "gaming", label: "Gaming" },
  { value: "sports", label: "Sports" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

export default function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [joiningCommunityId, setJoiningCommunityId] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    trpc.community.list.useInfiniteQuery(
      {
        limit: 12,
        search: debouncedSearch || null,
        category: category || null,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor }
    );

  const communities = data?.pages.flatMap((page) => page.items) ?? [];

  const { join, isJoining } = useJoinCommunity({
    limit: 12,
    search: debouncedSearch || null,
    category: category || null,
  });

  const handleJoin = useCallback(
    (communityId: string) => {
      setJoiningCommunityId(communityId);
      join(communityId);
    },
    [join]
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
              Discover Communities
            </h1>
            <p className="mt-1 text-[var(--color-text-secondary)]">
              Find your tribe and learn together
            </p>
          </div>
          <Link
            href="/create-community"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4 text-current" />
            Create Community
          </Link>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <input
              type="text"
              placeholder="Search communities by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4 text-current" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                category === cat.value
                  ? "bg-[var(--color-accent)] text-white"
                  : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Community Grid */}
        <CommunityList
          communities={communities}
          isLoading={isLoading}
          isError={isError}
          errorMessage={error?.message}
          onRetry={refetch}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage ?? false}
          loadMore={handleLoadMore}
          onJoin={handleJoin}
          joiningCommunityId={isJoining ? joiningCommunityId : null}
        />
      </div>
    </div>
  );
}