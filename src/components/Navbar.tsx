import Link from "next/link";
import { NexusLogo } from "./NexusLogo";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <NexusLogo className="h-7 w-7" />
          <span className="font-display text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
            Nexus
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-accent)]"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}