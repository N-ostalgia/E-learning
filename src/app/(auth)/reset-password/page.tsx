"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { NexusLogo } from "@/components/NexusLogo";
import { toast } from "sonner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is invalid or missing a token. Request a new one.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password, token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.message || "This link may have expired. Request a new one.";
        setError(message);
        toast.error(message);
        return;
      }

      toast.success("Password reset successfully");
      router.push("/login");
    } catch {
      setError("Network error. Please check your connection and try again.");
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <NexusLogo className="h-6 w-6" />
          <span className="font-display text-sm font-bold text-[var(--color-text-primary)]">
            Nexus
          </span>
        </Link>

        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
          Set new password
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Choose a new password for your account.
        </p>

        {!token && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            This link is missing or invalid. Go back and request a new reset email.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
              htmlFor="password"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
              htmlFor="confirmPassword"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {loading ? (
              <span className="mx-auto block h-4 w-24 animate-pulse rounded bg-white/50" aria-label="Resetting password" />
            ) : (
              "Reset password"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          <Link href="/login" className="font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
          <div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-[var(--color-border)]" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}