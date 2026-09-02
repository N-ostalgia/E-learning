// src/app/(dashboard)/community/[slug]/post/[postId]/page.tsx
import { PostCard } from "@/components/features/feed/PostCard";
import AnchorScroller from "@/components/common/AnchorScroller";
import { getPost } from "@/server/modules/feed/feed.service";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

export default async function PostPage({
  params,
}: {
  params: { slug: string; postId: string } | Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;

  const post = await getPost(postId, null);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back button */}
        <Link
          href={`/community/${slug}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
          Back to Community
        </Link>

        {/* Post Card */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <PostCard post={post} currentUserId={null} />
        </div>

        <AnchorScroller />
      </div>
    </div>
  );
}