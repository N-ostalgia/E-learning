"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/react";
import { ProfileHeader } from "@/components/features/profile/ProfileHeader";
import { ProfileStats } from "@/components/features/profile/ProfileStats";
import { ProfileTabs } from "@/components/features/profile/ProfileTabs";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  // Defense: params may still be URL-encoded (e.g. %20) depending on entry point.
  const username = decodeURIComponent(params.username ?? "").trim();

  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: profile, isLoading, error } = trpc.profile.getByUsername.useQuery(
    { username },
    { enabled: !!username }
  );

  if (isLoading || !username) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="h-24 w-24 animate-pulse rounded-full bg-[var(--color-border)]" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-48 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-4 w-32 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-4 w-64 animate-pulse rounded bg-[var(--color-border)]" />
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-[var(--color-border)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-red-700">Profile not found</h2>
          <p className="mt-1 text-sm text-red-600">
            {error?.message ||
              `No user found with the username "${username}".`}
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

  const isOwnProfile = session?.user?.id === profile.id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        onEdit={() => router.push("/profile/edit")}
      />

      <div className="mt-6">
        <ProfileStats
          postCount={profile.postCount}
          commentCount={profile.commentCount}
          communityCount={profile.communityCount}
          points={profile.points}
          level={profile.level}
        />
      </div>

      <div className="mt-8">
        <ProfileTabs userId={profile.id} />
      </div>
    </div>
  );
}
