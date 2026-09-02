"use client";

import Link from "next/link";

interface MentionTextProps {
  text: string;
  className?: string;
}

/**
 * Renders plain text but highlights `@username` mentions as accent-colored
 * links to the member's profile page.
 */
export function MentionText({ text, className }: MentionTextProps) {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("@") && part.length > 1) {
          const username = part.slice(1);
          return (
            <Link
              key={i}
              href={`/member/${username}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-[var(--color-accent)] hover:underline"
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

