"use client";

import {
  faFileLines,
  faComments,
  faUsers,
  faStar,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface ProfileStatsProps {
  postCount: number;
  commentCount: number;
  communityCount: number;
  points: number;
  level: number;
}

const statIcons: Record<string, React.ReactNode> = {
  posts: <FontAwesomeIcon icon={faFileLines} className="h-4 w-4 text-current" />,
  comments: <FontAwesomeIcon icon={faComments} className="h-4 w-4 text-current" />,
  communities: <FontAwesomeIcon icon={faUsers} className="h-4 w-4 text-current" />,
  points: <FontAwesomeIcon icon={faStar} className="h-4 w-4 text-current" />,
  level: <FontAwesomeIcon icon={faBolt} className="h-4 w-4 text-current" />,
};

export function ProfileStats({
  postCount,
  commentCount,
  communityCount,
  points,
  level,
}: ProfileStatsProps) {
  const stats = [
    { label: "Posts", value: postCount, key: "posts" },
    { label: "Comments", value: commentCount, key: "comments" },
    { label: "Communities", value: communityCount, key: "communities" },
    { label: "Points", value: points, key: "points" },
    { label: "Level", value: level, key: "level" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.key}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center"
        >
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            {statIcons[stat.key]}
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-[var(--color-text-primary)]">
            {stat.value}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)]">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
