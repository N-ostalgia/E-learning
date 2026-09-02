"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { usePost } from "@/hooks/usePost";
import { MentionTextarea } from "./MentionTextarea";

interface PostFormProps {
  communityId?: string;
  editMode?: boolean;
  initialData?: { id: string; title?: string; content: string; type: string };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const POST_TYPES = [
  { value: "post", label: "Post" },
  { value: "question", label: "Question" },
  { value: "announcement", label: "Announcement" },
] as const;

type PostType = "post" | "announcement" | "question";

export function PostForm({
  communityId,
  editMode = false,
  initialData,
  onSuccess,
  onCancel,
}: PostFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [type, setType] = useState<PostType>(
    (initialData?.type as PostType) ?? "post"
  );
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");
  const { createPost, isCreating, updatePost, isUpdating } = usePost();

  const { data: myCommunities, isLoading: communitiesLoading } =
    trpc.community.myCommunities.useQuery(undefined, {
      enabled: !communityId && !editMode,
    });

  const targetCommunityId = communityId || selectedCommunityId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    if (!editMode && !targetCommunityId) return;

    if (editMode && initialData) {
      updatePost(
        {
          postId: initialData.id,
          title: title.trim() || undefined,
          content: trimmedContent,
          type,
        },
        {
          onSuccess: () => {
            onSuccess?.();
          },
        }
      );
      return;
    }

    createPost(
      {
        communityId: targetCommunityId,
        title: title.trim() || undefined,
        content: trimmedContent,
        type,
      },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
          setType("post");
          setSelectedCommunityId("");
          onSuccess?.();
        },
      }
    );
  };

  const canSubmit = editMode ? true : !communityId ? !!targetCommunityId : true;
  const isSubmitting = editMode ? isUpdating : isCreating;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      {!communityId && !editMode && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
            Community
          </label>
          <select
            value={selectedCommunityId}
            onChange={(e) => setSelectedCommunityId(e.target.value)}
            required
            disabled={communitiesLoading}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-50"
          >
            <option value="">
              {communitiesLoading ? "Loading communities..." : "Select a community..."}
            </option>
            {myCommunities?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-center gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PostType)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
        >
          {POST_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          maxLength={200}
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
        />
      </div>
      <MentionTextarea
        value={content}
        onChange={setContent}
        communityId={targetCommunityId}
        placeholder="Share something with your community..."
        rows={4}
        className="mt-3 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <div className="mt-3 flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !content.trim() || !canSubmit}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {isSubmitting
            ? editMode
              ? "Updating..."
              : "Posting..."
            : editMode
              ? "Update Post"
              : "Post"}
        </button>
      </div>
    </form>
  );
}

