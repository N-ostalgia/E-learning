import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFaceFrown } from "@fortawesome/free-regular-svg-icons";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <FontAwesomeIcon
        icon={faFaceFrown}
        className="h-12 w-12 text-[var(--color-text-secondary)]"
      />
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Page not found</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
      >
        Go home
      </Link>
    </div>
  );
}

