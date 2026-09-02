"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <FontAwesomeIcon
        icon={faCircleExclamation}
        className="h-12 w-12 text-red-500"
      />
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Something went wrong</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
      >
        Try again
      </button>
    </div>
  );
}

