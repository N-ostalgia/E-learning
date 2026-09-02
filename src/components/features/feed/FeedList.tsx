"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faBookmark as faBookmarkSolid } from "@fortawesome/free-solid-svg-icons";
import { faBookmark as faBookmarkRegular } from "@fortawesome/free-regular-svg-icons";
import { useFeed } from "@/hooks/useFeed";
import { PostCard } from "./PostCard";
import { PostForm } from "./PostForm";
import { useSession } from "@/lib/auth-client";

interface FeedListProps {
  communityId?: string;
  showPostForm?: boolean;
  currentUserId?: string | null;
  isAdmin?: boolean;
  isOwner?: boolean;
  isModerator?: boolean;
  emptyState?: React.ReactNode;
  /** Optional list of the user's communities, used to show a community filter dropdown on the general feed. */
  communities?: { id: string; name: string; slug: string }[];
}

export function FeedList({
  communityId,
  showPostForm = false,
  currentUserId,
  isAdmin = false,
  isOwner = false,
  isModerator = false,
  emptyState,
  communities,
}: FeedListProps) {
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("all");
  const { data: session } = useSession();
  const userId = currentUserId ?? session?.user?.id ?? null;
  const isLoggedIn = !!userId;

  // On the general feed (no communityId), allow filtering by community.
  const effectiveCommunityId =
    communityId ?? (selectedCommunityId === "all" ? undefined : selectedCommunityId);

  const { posts, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useFeed(effectiveCommunityId, savedOnly);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 200
      ) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--color-border)]" />
              <div className="flex-1">
                <div className="h-4 w-40 animate-pulse rounded bg-[var(--color-border)]" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded bg-[var(--color-border)]" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-border)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
        {emptyState ?? (
          <>
            <FontAwesomeIcon
              icon={savedOnly ? faBookmarkSolid : faStar}
              className="mx-auto h-10 w-10 text-[var(--color-text-secondary)]"
            />
            <h3 className="mt-3 font-display text-lg font-semibold text-[var(--color-text-primary)]">
              {savedOnly ? "No saved posts" : "No posts yet"}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {savedOnly
                ? "Posts you save with the bookmark icon will appear here."
                : "Be the first to share something with the community!"}
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isLoggedIn && !communityId && (
        <div className="flex items-center justify-between gap-2">
          {communities && communities.length > 0 && (
            <select
              value={selectedCommunityId}
              onChange={(e) => setSelectedCommunityId(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              aria-label="Filter by community"
            >
              <option value="all">All communities</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setSavedOnly((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              savedOnly
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
            }`}
            aria-label="Toggle saved posts"
          >
            <FontAwesomeIcon
              icon={savedOnly ? faBookmarkSolid : faBookmarkRegular}
              className="h-3.5 w-3.5 text-current"
            />
            {savedOnly ? "Showing saved" : "Saved"}
          </button>
        </div>
      )}

      {showPostForm && communityId && <PostForm communityId={communityId} />}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={userId}
          isAdmin={isAdmin}
          isOwner={isOwner}
          isModerator={isModerator}
        />
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mx-auto block rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)] disabled:opacity-50"
        >
          {isFetchingNextPage ? "Loading more..." : "Load more posts"}
        </button>
      )}
    </div>
  );
}

