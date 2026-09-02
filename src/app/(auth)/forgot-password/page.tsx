"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { NexusLogo } from "@/components/NexusLogo";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  setError(null);
  setLoading(true);
  setSent(false);

  try {
    const res = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirectTo: "/reset-password" }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const message = data?.message || "Something went wrong.";
      setError(message);
      toast.error(message);
      return;
    }

    setSent(true);
    toast.success("Password reset link sent");
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
          Reset password
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@company.com"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {sent && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              Check your email for the reset link.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || sent}
            className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {loading ? (
              <span className="mx-auto block h-4 w-24 animate-pulse rounded bg-white/50" aria-label="Sending reset link" />
            ) : (
              "Send reset link"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}