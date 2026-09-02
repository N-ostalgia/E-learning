// src/app/(dashboard)/community/[slug]/page.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCog,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import { FeedList } from "@/components/features/feed/FeedList";
import { PostComposer } from "@/components/features/feed/PostComposer";
import { CourseList } from "@/components/features/course/CourseList";
import CommunityMembersPage from "./members/page";
import { Leaderboard } from "@/components/features/community/Leaderboard";
import { CalendarView } from "@/components/features/community/CalendarView";

const TABS = [
  { id: "feed", label: "Feed" },
  { id: "courses", label: "Courses" },
  { id: "calendar", label: "Calendar" },
  { id: "members", label: "Members" },
  { id: "leaderboard", label: "Leaderboard" },
] as const;

export default function CommunityDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<string>("feed");
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const { data: community, isLoading, error } = trpc.community.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  const utils = trpc.useUtils();
  
  const joinMutation = trpc.community.join.useMutation({
    onSuccess: (data) => {
      utils.community.getBySlug.invalidate({ slug });
      utils.community.list.invalidate();
      utils.community.myCommunities.invalidate();
      if (data.status === "pending") {
        toast.success("Membership request sent! Waiting for approval.");
      } else {
        toast.success("Successfully joined the community!");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to join community.");
    },
  });

  const leaveMutation = trpc.community.leave.useMutation({
    onSuccess: () => {
      utils.community.getBySlug.invalidate({ slug });
      utils.community.list.invalidate();
      utils.community.myCommunities.invalidate();
      toast.success("Left the community.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to leave community.");
    },
  });

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

  const handleJoin = () => {
    if (!community) return;
    
    const hasPrice = !!(community.price && community.price > 0);
    
    if (hasPrice) {
      createCheckout.mutate({ communityId: community.id });
    } else {
      joinMutation.mutate({ communityId: community.id });
    }
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    // No navigation – all tabs stay on the same page.
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-[var(--color-border)]" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-red-700">Community not found</h2>
          <p className="mt-1 text-sm text-red-600">
            {error?.message || "This community doesn't exist or has been removed."}
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-block text-sm font-medium text-[var(--color-accent)] hover:underline"
          >
            Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = !!(community.price && community.price > 0);
  const priceDisplay = isPaid && community.price ? `$${(community.price / 100).toFixed(2)}/mo` : "Free";

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/discover"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
          Back to Discover
        </Link>

        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {/* Cover Image */}
          <div className="relative h-48 sm:h-56">
            {community.coverUrl ? (
              <img
                src={community.coverUrl}
                alt={`${community.name} cover`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-emerald-500/20 to-emerald-600/20" />
            )}
          </div>

          <div className="relative px-6 pb-6">
            <div className="flex items-end gap-4">
              <div className="-mt-12 flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border-4 border-[var(--color-surface)] bg-gradient-to-br from-emerald-400 to-emerald-600 text-3xl font-bold text-white shadow-lg">
                {community.avatarUrl ? (
                  <img src={community.avatarUrl} alt={community.name} className="h-full w-full object-cover" />
                ) : (
                  community.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
                    {community.name}
                  </h1>
                  {!community.isPublic && (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Private
                    </span>
                  )}
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    isPaid 
                      ? "bg-emerald-100 text-emerald-700" 
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {priceDisplay}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {community.memberCount} member{community.memberCount !== 1 ? "s" : ""}
                  {community.category && ` · ${community.category.charAt(0).toUpperCase() + community.category.slice(1)}`}
                  {community.ownerUsername && ` · by @${community.ownerUsername}`}
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
              {community.isOwner && (
                <Link
                  href={`/community/${community.slug}/settings`}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-accent-soft)]"
                >
                  <FontAwesomeIcon icon={faCog} className="h-4 w-4 text-current" />
                  Settings
                </Link>
              )}
              {community.membership?.status === "active" && !community.isOwner && (
                <button
                  onClick={() => leaveMutation.mutate({ communityId: community.id })}
                  disabled={leaveMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  Leave
                </button>
              )}
              {!community.isMember && (
                <button
                  onClick={handleJoin}
                  disabled={joinMutation.isPending || createCheckout.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                >
                  {createCheckout.isPending ? "Redirecting..." : 
                   joinMutation.isPending ? "Joining..." : 
                   isPaid ? `Subscribe ${priceDisplay}` : 
                   community.isPublic ? "Join" : "Request to Join"}
                </button>
              )}
              {community.membership?.status === "pending" && (
                <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                  Pending
                </span>
              )}
            </div>
          </div>
        </div>

        {community.description && (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">About</h2>
            <p className="mt-2 text-[var(--color-text-secondary)] leading-relaxed">{community.description}</p>
          </div>
        )}

        {community.isMember ? (
          <>
            <div className="mt-6 border-b border-[var(--color-border)]">
              <nav className="flex gap-6">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabClick(tab.id)}
                      aria-selected={isActive}
                      role="tab"
                      className={`pb-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="mt-6">
              {activeTab === "feed" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                      Latest Posts
                    </h2>
                    <PostComposer communityId={community.id} />
                  </div>
                  <FeedList
                    communityId={community.id}
                    isAdmin={community.membership?.role === "admin"}
                    isModerator={community.membership?.role === "moderator"}
                    isOwner={community.isOwner}
                  />
                </div>
              )}
              {activeTab === "courses" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Courses
                      </h2>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Learn from curated courses in this community
                      </p>
                    </div>
                    {community.isOwner && (
                      <Link
                        href={`/community/${slug}/courses/create`}
                        className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                      >
                        Create Course
                      </Link>
                    )}
                  </div>
                  <CourseList communityId={community.id} communitySlug={slug} />
                </div>
              )}
              {activeTab === "calendar" && (
  <div className="mt-6">
    <CalendarView
      communityId={community.id}
      canManage={community.isOwner || community.membership?.role === "admin"}
    />
  </div>
)}
              {activeTab === "members" && (
                <CommunityMembersPage />
              )}
              {activeTab === "leaderboard" && (
                <Leaderboard communitySlug={slug} />
              )}
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
            <FontAwesomeIcon
              icon={faLock}
              className="mx-auto h-10 w-10 text-[var(--color-text-secondary)]"
            />
            <h3 className="mt-3 font-display text-lg font-semibold text-[var(--color-text-primary)]">
              {community.isPublic ? "Join to see what's inside" : "This community is private"}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {community.isPublic
                ? "The feed, courses, calendar, and member list are only visible to members."
                : "Request to join to see the feed, courses, and member list."}
            </p>
            {isPaid && (
              <p className="mt-2 text-sm font-medium text-emerald-600">
                This community requires a subscription of {priceDisplay} to join.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}