// src/app/(dashboard)/admin/communities/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faBuilding,
  faUsers,
  faPenFancy,
  faTrash,
  faUser,
  faCalendar,
  faGlobe,
  faLock,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

export default function CommunitiesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const utils = trpc.useUtils();

  const communitiesQuery = trpc.admin.communities.list.useInfiniteQuery(
    { search: debouncedSearch || undefined, limit: 20 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined }
  );

  const data = communitiesQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const isLoading = communitiesQuery.isLoading;
  const refetch = communitiesQuery.refetch;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Refetch when search changes
  useEffect(() => {
    refetch();
  }, [debouncedSearch, refetch]);

  const deleteMutation = trpc.admin.communities.delete.useMutation({
    onSuccess: () => {
      utils.admin.communities.list.invalidate();
      refetch();
      toast.success("Community deleted successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete community");
    },
  });

  const handleDelete = (communityId: string, communityName: string) => {
    if (
      confirm(
        `Are you sure you want to permanently delete "${communityName}"? This will also delete all posts, comments, and member data associated with this community. This cannot be undone.`
      )
    ) {
      deleteMutation.mutate({ communityId });
    }
  };

  const communities = data ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
              Communities
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Manage platform communities
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <span className="font-medium text-[var(--color-text-primary)]">{communities.length}</span> communities
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
          <input
            type="text"
            placeholder="Search communities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)]"
          />
        </div>
      </div>

      {/* Communities List */}
      {communities.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <FontAwesomeIcon
            icon={faBuilding}
            className="mx-auto h-12 w-12 text-[var(--color-text-secondary)]"
          />
          <h3 className="mt-4 font-display text-lg font-semibold text-[var(--color-text-primary)]">
            No communities found
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {search
              ? `No communities matching "${search}"`
              : "There are no communities on the platform yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-[var(--color-border)]">
              <thead className="bg-[var(--color-bg)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Community
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Privacy
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Stats
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                {communities.map((community) => (
                  <tr
                    key={community.id}
                    className="transition-colors hover:bg-[var(--color-bg)]"
                  >
                    {/* Community */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {community.avatarUrl ? (
                          <img
                            src={community.avatarUrl}
                            alt={community.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-sm font-medium text-emerald-700">
                            {community.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/community/${community.slug}`}
                            target="_blank"
                            className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)]"
                          >
                            {community.name}
                          </Link>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {community.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Privacy */}
                    <td className="px-4 py-3">
                      {community.isPublic ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <FontAwesomeIcon icon={faGlobe} className="h-3 w-3" />
                          Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                          <FontAwesomeIcon icon={faLock} className="h-3 w-3" />
                          Private
                        </span>
                      )}
                    </td>

                    {/* Stats */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faUsers} className="h-3 w-3" />
                          {community.memberCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faPenFancy} className="h-3 w-3" />
                          {community.postCount}
                        </span>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--color-text-primary)]">
                          {community.ownerName}
                        </span>
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          @{community.ownerUsername}
                        </span>
                      </div>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                      {new Date(community.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(community.id, community.name)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                      >
                        <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        {communitiesQuery.hasNextPage && (
          <div className="mt-3 text-center">
            <button
              onClick={() => communitiesQuery.fetchNextPage()}
              disabled={communitiesQuery.isFetchingNextPage}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] disabled:opacity-50"
            >
              {communitiesQuery.isFetchingNextPage ? "Loading..." : "Load more communities"}
            </button>
          </div>
        )}
    </div>
  );
}