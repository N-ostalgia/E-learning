"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRocket,
  faFire,
  faStar,
  faComment,
  faComments,
  faHeart,
  faThumbsUp,
  faGraduationCap,
  faTrophy,
  faMedal,
  faCrown,
  faGem,
  faUsers,
  faUsersCog,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";

interface ProfileBadgesProps {
  userId: string;
  isOwnProfile?: boolean;
}

// Map icon names to FontAwesome icon definitions
const iconMap: Record<string, any> = {
  faRocket,
  faFire,
  faStar,
  faComment,
  faComments,
  faHeart,
  faThumbsUp,
  faGraduationCap,
  faTrophy,
  faMedal,
  faCrown,
  faGem,
  faUsers,
  faUsersCog,
};

export function ProfileBadges({ userId, isOwnProfile }: ProfileBadgesProps) {
  const { data: badges, isLoading } = trpc.badge.getByUser.useQuery({ userId }, {
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-[var(--color-border)]" />
        ))}
      </div>
    );
  }

  if (!badges || badges.length === 0) {
    return (
      <div className="text-sm text-[var(--color-text-secondary)]">
        {isOwnProfile
          ? "You haven't earned any badges yet. Keep participating!"
          : "This user hasn't earned any badges yet."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {badges.map((ub) => (
        <div
          key={ub.id}
          className="flex flex-col items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-center"
          title={ub.badge.description}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-2xl text-white"
            style={{ backgroundColor: ub.badge.color || "#10b981" }}
          >
            <FontAwesomeIcon icon={iconMap[ub.badge.icon] || faRocket} />
          </div>
          <span className="mt-1 text-xs font-medium text-[var(--color-text-primary)]">
            {ub.badge.name}
          </span>
          <span className="text-[10px] text-[var(--color-text-secondary)]">
            {new Date(ub.earnedAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}