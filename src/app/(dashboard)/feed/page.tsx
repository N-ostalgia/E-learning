"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers } from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { FeedList } from "@/components/features/feed/FeedList";
import { PostComposer } from "@/components/features/feed/PostComposer";

export default function FeedPage() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const { data: myCommunities, isLoading: communitiesLoading } =
    trpc.community.myCommunities.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const hasCommunities = (myCommunities?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
            Feed
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Latest posts from your communities
          </p>
        </div>
        {session?.user && hasCommunities && <PostComposer />}
      </div>

      {!session?.user ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
          <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
            Sign in to see your feed
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Create an account or sign in to join communities and see posts.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
            >
              Create account
            </Link>
          </div>
        </div>
      ) : communitiesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-[var(--color-border)]"
            />
          ))}
        </div>
      ) : !hasCommunities ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
          <FontAwesomeIcon
            icon={faUsers}
            className="mx-auto h-10 w-10 text-[var(--color-text-secondary)]"
          />
          <h3 className="mt-3 font-display text-lg font-semibold text-[var(--color-text-primary)]">
            Join a community to see posts
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Your feed will show posts from all the communities you join.
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Discover Communities
          </Link>
        </div>
      ) : (
        <FeedList
          showPostForm={false}
          communities={myCommunities?.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
          }))}
        />
      )}
    </div>
  );
}

