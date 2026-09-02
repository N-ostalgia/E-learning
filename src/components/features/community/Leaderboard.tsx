"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrophy,
  faMedal,
  faCrown,
  faUser,
  faCalendarWeek,
  faCalendarAlt,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";

type TimeRange = "all" | "week" | "month";

interface LeaderboardProps {
  communitySlug: string;
}

const TIME_RANGES: { id: TimeRange; label: string; icon: any }[] = [
  { id: "all", label: "All Time", icon: faTrophy },
  { id: "week", label: "This Week", icon: faCalendarWeek },
  { id: "month", label: "This Month", icon: faCalendarAlt },
];

const MEDALS = [
  { rank: 1, icon: faCrown, color: "text-yellow-500" },
  { rank: 2, icon: faMedal, color: "text-gray-400" },
  { rank: 3, icon: faMedal, color: "text-amber-700" },
];

export function Leaderboard({ communitySlug }: LeaderboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const { data, isLoading } = trpc.leaderboard.getLeaderboard.useQuery({
    communitySlug,
    timeRange,
    limit: 10,
  });

  const getMedal = (rank: number) => {
    const medal = MEDALS.find((m) => m.rank === rank);
    if (medal) {
      return (
        <FontAwesomeIcon
          icon={medal.icon}
          className={`text-2xl ${medal.color}`}
        />
      );
    }
    return (
      <span className="text-sm font-medium text-[var(--color-text-secondary)]">
        #{rank}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-[var(--color-text-secondary)]">
        No data available
      </div>
    );
  }

  return (
    <div>
      {/* Time Range Tabs */}
      <div className="mb-6 flex gap-2 border-b border-[var(--color-border)]">
        {TIME_RANGES.map((range) => {
          const isActive = timeRange === range.id;
          return (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <FontAwesomeIcon icon={range.icon} className="h-4 w-4" />
              {range.label}
            </button>
          );
        })}
      </div>

      {/* Leaderboard List */}
      {data.leaderboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
          <FontAwesomeIcon icon={faTrophy} className="h-12 w-12 text-[var(--color-text-secondary)]" />
          <h3 className="mt-4 font-display text-lg font-semibold text-[var(--color-text-primary)]">
            No points yet
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Members earn points by posting, commenting, and receiving likes.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.leaderboard.map((entry) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors ${
                entry.rank <= 3
                  ? "border-yellow-500/30 bg-yellow-500/5"
                  : "hover:bg-[var(--color-bg)]"
              }`}
            >
              {/* Rank */}
              <div className="w-10 flex-shrink-0 text-center">
                {getMedal(entry.rank)}
              </div>

              {/* Avatar */}
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                {entry.avatar ? (
                  <img
                    src={entry.avatar}
                    alt={entry.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                    <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--color-text-primary)]">
                  {entry.name || entry.username}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  @{entry.username}
                </p>
              </div>

              {/* Points & Level */}
              <div className="text-right">
                <p className="font-bold text-[var(--color-accent)]">
                  {entry.points} pts
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Level {entry.level}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current User's Rank */}
      {data.currentUserRank && (
        <div className="mt-4 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Your rank
              </p>
              <p className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
                #{data.currentUserRank}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Your points
              </p>
              <p className="font-display text-2xl font-bold text-[var(--color-accent)]">
                {data.currentUserPoints} pts
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}