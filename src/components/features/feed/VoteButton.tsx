"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as faHeartSolid } from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import { useVote } from "@/hooks/useVote";

interface VoteButtonProps {
  targetId: string;
  targetType: "post" | "comment";
  voteCount: number;
  userVote: number | null;
  onVoteChange?: (voteCount: number, userVote: number | null) => void;
}

export function VoteButton({
  targetId,
  targetType,
  voteCount,
  userVote,
}: VoteButtonProps) {
  const { toggleVote, isVoting } = useVote();
  const isLiked = userVote === 1;

  return (
    <button
      onClick={() => toggleVote({ targetId, targetType })}
      disabled={isVoting}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all disabled:opacity-50 ${
        isLiked
          ? "bg-red-50 text-red-600"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)]"
      }`}
      aria-label={isLiked ? "Unlike" : "Like"}
    >
      <FontAwesomeIcon
        icon={isLiked ? faHeartSolid : faHeartRegular}
        className="h-4 w-4 text-current"
      />
      <span>{voteCount}</span>
    </button>
  );
}

