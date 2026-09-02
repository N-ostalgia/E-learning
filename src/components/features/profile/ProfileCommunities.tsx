"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers } from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";

interface ProfileCommunitiesProps {
  userId: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700",
  admin: "bg-emerald-100 text-emerald-700",
  moderator: "bg-sky-100 text-sky-700",
  member: "bg-slate-100 text-slate-600",
};

export function ProfileCommunities({ userId }: ProfileCommunitiesProps) {
  const { data: communities, isLoading } =
    trpc.profile.getCommunities.useQuery({ userId });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-[var(--color-border)]"
          />
        ))}
      </div>
    );
  }

  if (!communities || communities.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-soft)]">
          <FontAwesomeIcon
            icon={faUsers}
            className="h-5 w-5 text-[var(--color-accent)]"
          />
        </div>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          Not a member of any communities yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {communities.map((community) => (
        <Link
          key={community.id}
          href={`/community/${community.slug}`}
          className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all hover:border-[var(--color-accent)]/50 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-lg font-bold text-white">
              {community.avatarUrl ? (
                <img
                  src={community.avatarUrl}
                  alt={community.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                community.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                {community.name}
              </h3>
              <p className="truncate text-xs text-[var(--color-text-secondary)]">
                {community.memberCount} member
                {community.memberCount !== 1 ? "s" : ""}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${ROLE_COLORS[community.role] ?? ROLE_COLORS.member}`}
            >
              {community.role}
            </span>
          </div>
          {community.description && (
            <p className="mt-3 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
              {community.description}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
