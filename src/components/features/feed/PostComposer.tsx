"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { PostForm } from "./PostForm";

interface PostComposerProps {
  communityId?: string;
}

/**
 * Reusable "Create Post" button that opens a centered modal containing the PostForm.
 * - When `communityId` is provided (community feed), the form targets that community.
 * - When omitted (main feed), the form shows a community selector.
 */
export function PostComposer({ communityId }: PostComposerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
        Create Post
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Create a Post
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                aria-label="Close"
              >
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
              </button>
            </div>
            <PostForm
              communityId={communityId}
              onSuccess={() => setIsOpen(false)}
              onCancel={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

