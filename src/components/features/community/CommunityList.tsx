// src/components/features/community/CommunityList.tsx
"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { CommunityCard } from "./CommunityCard";
import type { CommunityWithMemberCount } from "@/server/modules/community/community.types";

interface CommunityListProps {
  communities: CommunityWithMemberCount[];
  isLoading: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
  onJoin: (communityId: string) => void;
  joiningCommunityId: string | null;
}

export function CommunityList({
  communities,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  isFetchingNextPage,
  hasNextPage,
  loadMore,
  onJoin,
  joiningCommunityId,
}: CommunityListProps) {
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-red-50 p-4">
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            className="h-8 w-8 text-red-500"
          />
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Failed to load communities
        </h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {errorMessage || "An unexpected error occurred. Please try again."}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
          >
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="mt-4 h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  if (communities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-[var(--color-accent-soft)] p-4">
          <FontAwesomeIcon
            icon={faUsers}
            className="h-8 w-8 text-[var(--color-accent)]"
          />
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          No communities found
        </h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Try a different search or create a new community.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {communities.map((community) => (
          <CommunityCard
            key={community.id}
            community={community}
            onJoin={onJoin}
            isJoining={joiningCommunityId === community.id}
          />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isFetchingNextPage}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
          >
            {isFetchingNextPage ? "Loading more..." : "Load more communities"}
          </button>
        </div>
      )}
    </div>
  );
}
