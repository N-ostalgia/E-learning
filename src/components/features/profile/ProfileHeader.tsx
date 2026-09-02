"use client";

import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendar,
  faLocationDot,
  faLink,
  faPen,
  faMessage,
  faEllipsisVertical,
  faFlag,
  faBan,
  faCheckCircle,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import type { UserProfile } from "@/server/modules/profile/profile.types";
import { trpc } from "@/lib/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile?: boolean;
  onEdit?: () => void;
}

function formatJoinDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function normalizeUrl(value: string): string {
  return value.startsWith("http") ? value : `https://${value}`;
}

function displayLabel(value: string, kind: string): string {
  if (kind === "website" || kind === "linkedin") {
    const url = normalizeUrl(value);
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return value;
    }
  }
  return `@${value.replace(/^@/, "")}`;
}

function SocialLink({
  value,
  kind,
}: {
  value: string | null;
  kind: "website" | "github" | "twitter" | "linkedin";
}) {
  if (!value) return null;
  const href = normalizeUrl(value);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={kind.charAt(0).toUpperCase() + kind.slice(1)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
    >
      <FontAwesomeIcon icon={faLink} className="h-3.5 w-3.5 text-current" />
      <span className="capitalize">{kind}</span>
      <span className="text-[var(--color-text-primary)]">
        · {displayLabel(value, kind)}
      </span>
    </a>
  );
}

function ProfileActionsMenu({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const [open, setOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: session } = trpc.auth.getSession.useQuery();
  const currentUserId = session?.user?.id;

  const { data: blockStatus, refetch: refetchBlock } = trpc.user.isBlocked.useQuery(
    { userId },
    { enabled: !!currentUserId && currentUserId !== userId }
  );
  const isBlocked = blockStatus?.blocked ?? false;

  const blockMutation = trpc.user.block.useMutation({
    onSuccess: () => {
      toast.success("User blocked");
      refetchBlock();
      utils.user.isBlocked.invalidate({ userId });
    },
    onError: (err) => toast.error(err.message),
  });

  const unblockMutation = trpc.user.unblock.useMutation({
    onSuccess: () => {
      toast.success("User unblocked");
      refetchBlock();
      utils.user.isBlocked.invalidate({ userId });
    },
    onError: (err) => toast.error(err.message),
  });

  const reportMutation = trpc.user.report.useMutation({
    onSuccess: () => {
      toast.success("Report submitted. Thank you for helping keep our community safe.");
      setShowReportModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBlockToggle = () => {
    if (isBlocked) {
      if (confirm("Unblock this user?")) unblockMutation.mutate({ userId });
    } else {
      if (confirm("Block this user? They will not be able to interact with you."))
        blockMutation.mutate({ userId });
    }
    setOpen(false);
  };

  if (!currentUserId || currentUserId === userId) return null;

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
          aria-label="More actions"
        >
          <FontAwesomeIcon icon={faEllipsisVertical} className="h-5 w-5" />
        </button>

        {open && (
          <div className="absolute right-0 z-10 mt-1 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
            <button
              onClick={() => {
                setOpen(false);
                setShowReportModal(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
            >
              <FontAwesomeIcon icon={faFlag} className="h-4 w-4 text-[var(--color-text-secondary)]" />
              Report User
            </button>
            <button
              onClick={handleBlockToggle}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
            >
              <FontAwesomeIcon
                icon={isBlocked ? faCheckCircle : faBan}
                className={`h-4 w-4 ${isBlocked ? "text-emerald-500" : "text-[var(--color-text-secondary)]"}`}
              />
              {isBlocked ? "Unblock User" : "Block User"}
            </button>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          userId={userId}
          username={username}
          onClose={() => setShowReportModal(false)}
          onSubmit={(reason, details) => {
            reportMutation.mutate({ userId, reason, details });
          }}
          isPending={reportMutation.isPending}
        />
      )}
    </>
  );
}

function ReportModal({
  userId,
  username,
  onClose,
  onSubmit,
  isPending,
}: {
  userId: string;
  username: string;
  onClose: () => void;
  onSubmit: (reason: string, details?: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onSubmit(reason.trim(), details.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
            Report @{username}
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
              required
            >
              <option value="">Select a reason...</option>
              <option value="harassment">Harassment or bullying</option>
              <option value="spam">Spam</option>
              <option value="inappropriate_content">Inappropriate content</option>
              <option value="impersonation">Impersonation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              Additional details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
              placeholder="Provide more context about your report..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!reason.trim() || isPending}
              className="flex-1 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
            >
              {isPending ? "Submitting..." : "Submit Report"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProfileHeader({
  profile,
  isOwnProfile = false,
  onEdit,
}: ProfileHeaderProps) {
  const router = useRouter();
  const { data: session } = trpc.auth.getSession.useQuery();

  const createConversation = trpc.message.getOrCreate.useMutation({
    onSuccess: (data) => {
      router.push(`/messages/${data.conversationId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start conversation");
    },
  });

  const handleMessage = () => {
    if (!session?.user) {
      toast.error("Please sign in to send messages");
      return;
    }
    createConversation.mutate({ userId: profile.id });
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-3xl font-bold text-white shadow-lg">
            {profile.image ? (
              <img
                src={profile.image}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            ) : (
              profile.name.charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
              {profile.name}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              @{profile.username}
            </p>
            {profile.bio && (
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--color-text-primary)]">
                {profile.bio}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
              <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faCalendar} className="h-3.5 w-3.5 text-current" />
                Joined {formatJoinDate(profile.createdAt)}
              </span>
              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <FontAwesomeIcon icon={faLocationDot} className="h-3.5 w-3.5 text-current" />
                  {profile.location}
                </span>
              )}
            </div>

            {(profile.website ||
              profile.github ||
              profile.twitter ||
              profile.linkedin) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {profile.website && (
                  <SocialLink value={profile.website} kind="website" />
                )}
                {profile.github && (
                  <SocialLink value={profile.github} kind="github" />
                )}
                {profile.twitter && (
                  <SocialLink value={profile.twitter} kind="twitter" />
                )}
                {profile.linkedin && (
                  <SocialLink value={profile.linkedin} kind="linkedin" />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
          {!isOwnProfile && session?.user && (
            <>
              <button
                onClick={handleMessage}
                disabled={createConversation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
              >
                <FontAwesomeIcon icon={faMessage} className="h-4 w-4 text-current" />
                {createConversation.isPending ? "Starting..." : "Message"}
              </button>
              <ProfileActionsMenu userId={profile.id} username={profile.username} />
            </>
          )}
          {isOwnProfile && (
            <button
              onClick={onEdit}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              <FontAwesomeIcon icon={faPen} className="h-4 w-4 text-current" />
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}