"use client";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Critical error</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            A critical error occurred. Please refresh the page.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}

