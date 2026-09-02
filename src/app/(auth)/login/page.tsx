"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";
import { NexusLogo } from "@/components/NexusLogo";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: clientSession } = useSession();

  const { data: serverSession } = trpc.auth.getSession.useQuery(undefined, {
    enabled: !!clientSession && !loading,
  });

  useEffect(() => {
    if (!serverSession) return;
    const role = serverSession?.user?.globalRole;
    if (role === "admin" || role === "super_admin") {
      router.push("/admin");
    } else {
      router.push("/feed");
    }
  }, [serverSession, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/redirect",
      });

      if (signInError) {
        const message = signInError.message || "Sign in failed";
        setError(message);
        toast.error(message);
        setLoading(false);
        return;
      }
      toast.success("Signed in successfully");
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
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Sign in to continue to your learning dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
                htmlFor="password"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="••••••••"
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
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {loading ? (
              <span className="mx-auto block h-4 w-20 animate-pulse rounded bg-white/50" aria-label="Signing in" />
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          Don't have an account?{" "}
          <Link href="/register" className="font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}