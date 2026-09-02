"use client";

import { useState, useEffect } from "react";
import { MentionTextarea } from "./MentionTextarea";

interface CommentFormProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  /** When set, the form starts in edit mode with this pre-filled content. */
  initialValue?: string;
  /** Community id used to load members for @-mention suggestions. */
  communityId?: string;
}

export function CommentForm({
  onSubmit,
  onCancel,
  isSubmitting,
  placeholder = "Write a comment...",
  submitLabel = "Comment",
  autoFocus = false,
  initialValue = "",
  communityId,
}: CommentFormProps) {
  const [content, setContent] = useState(initialValue);

  // Keep the textarea in sync when switching between edit targets.
  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <MentionTextarea
        value={content}
        onChange={setContent}
        communityId={communityId}
        placeholder={placeholder}
        rows={2}
        autoFocus={autoFocus}
        className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {isSubmitting ? "Posting..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

