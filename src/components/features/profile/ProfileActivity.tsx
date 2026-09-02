"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faComment,
  faInbox,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";

interface ProfileActivityProps {
  userId: string;
}

function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(content: string, max = 160): string {
  if (content.length <= max) return content;
  return content.slice(0, max).trimEnd() + "…";
}

export function ProfileActivity({ userId }: ProfileActivityProps) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = trpc.profile.getActivity.useInfiniteQuery(
    { userId, limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialCursor: undefined,
    }
  );

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl bg-[var(--color-border)]"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-soft)]">
          <FontAwesomeIcon
            icon={faInbox}
            className="h-5 w-5 text-[var(--color-accent)]"
          />
        </div>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          No activity yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                  item.type === "post"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-sky-100 text-sky-700"
                }`}
              >
                <FontAwesomeIcon
                  icon={item.type === "post" ? faFileLines : faComment}
                  className="h-3 w-3 text-current"
                />
                {item.type === "post" ? "Post" : "Comment"}
              </span>
              <Link
                href={`/community/${item.communitySlug}`}
                className="text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                {item.communityName}
              </Link>
              <span className="text-xs text-[var(--color-text-secondary)]">
                · {formatDate(item.createdAt)}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">
              {truncate(item.content)}
            </p>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-accent-soft)] disabled:opacity-50"
          >
            {isFetchingNextPage ? "Loading more..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
