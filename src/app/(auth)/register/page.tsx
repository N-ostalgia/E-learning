"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { NexusLogo } from "@/components/NexusLogo";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setError("Username can only contain letters, numbers, and underscores (no spaces).");
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await authClient.signUp.email({
        name,
        email,
        password,
        username: trimmedUsername,
      } as any);

      if (signUpError) {
        const message = signUpError.message || "Something went wrong creating your account.";
        setError(message);
        toast.error(message);
        return;
      }

      toast.success("Account created successfully");
      router.push("/discover");
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
          Create your account
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Join the Nexus community to start learning.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
              htmlFor="name"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Your name"
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
              htmlFor="username"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              minLength={3}
              placeholder="yourname"
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </div>

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
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="name@company.com"
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {loading ? (
              <span className="mx-auto block h-4 w-28 animate-pulse rounded bg-white/50" aria-label="Creating account" />
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}