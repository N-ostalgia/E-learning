// src/components/features/community/CommunityCard.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRotateRight,
  faCheck,
  faLock,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import type { CommunityWithMemberCount } from "@/server/modules/community/community.types";

interface CommunityCardProps {
  community: CommunityWithMemberCount;
  onJoin: (communityId: string) => void;
  isJoining: boolean;
}

export function CommunityCard({ community, onJoin, isJoining }: CommunityCardProps) {
  const memberCount = community.memberCount ?? 0;
  const isMember = community.isMember ?? false;
  const membershipStatus = community.membershipStatus ?? null;
  const isPending = membershipStatus === "pending";
  const isPrivate = !community.isPublic;
  const isPaid = !!(community.price && community.price > 0);

  const createCheckout = trpc.community.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start checkout process.");
    },
  });

  const handleJoinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPaid) {
      createCheckout.mutate({ communityId: community.id });
    } else {
      onJoin(community.id);
    }
  };

  const getButtonText = () => {
    if (createCheckout.isPending) return "Redirecting...";
    if (isJoining) return "Joining...";
    if (isPaid && community.price) return `Subscribe $${(community.price / 100).toFixed(2)}/mo`;
    if (isPrivate) return "Request to Join";
    return "Join";
  };

  return (
    <div className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all hover:shadow-md hover:border-[var(--color-accent)]/50">
      <Link href={`/community/${community.slug}`} className="block">
        {/* Cover — now the dominant visual element, no overlap trickery */}
        <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-50 sm:h-40">
          {community.coverUrl && (
            <Image
              src={community.coverUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          )}
        </div>

        <div className="px-6 pb-6 pt-4">
          {/* Avatar sits inline with the title — normal flow, nothing overlapping */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
              {community.avatarUrl ? (
                <Image
                  src={community.avatarUrl}
                  alt={community.name}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                  {community.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold text-[var(--color-text-primary)]">
                  {community.name}
                </h3>
                {isPrivate && (
                  <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    <FontAwesomeIcon icon={faLock} className="h-3 w-3 text-current" />
                    Private
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5 text-current" />
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </span>
                {isPaid && community.price && (
                  <span className="text-[var(--color-text-primary)] font-medium">
                    ${(community.price / 100).toFixed(2)}/mo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {community.description && (
            <p className="mt-3 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
              {community.description}
            </p>
          )}

          {/* Action Button */}
          <div className="mt-4">
            {isMember || isPending ? (
              <span
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                  isPending
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {isPending ? (
                  <>
                    <FontAwesomeIcon icon={faArrowRotateRight} className="h-4 w-4 text-current" />
                    Pending
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheck} className="h-4 w-4 text-current" />
                    Joined
                  </>
                )}
              </span>
            ) : (
              <button
                onClick={handleJoinClick}
                disabled={isJoining || createCheckout.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
              >
                {getButtonText()}
              </button>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}