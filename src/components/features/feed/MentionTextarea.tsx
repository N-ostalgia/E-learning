"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/react";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  communityId?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}

type MentionUser = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  role?: string;
};

/**
 * A textarea that shows a dropdown of community members when the user types `@`.
 * Selecting a suggestion inserts the `@username` text into the content.
 */
export function MentionTextarea({
  value,
  onChange,
  communityId,
  placeholder,
  rows = 2,
  className,
  autoFocus,
}: MentionTextareaProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: members, isLoading: membersLoading } =
    trpc.community.listMembers.useQuery(
      { communityId: communityId ?? "" },
      { enabled: !!communityId && showMentions }
    );

  // Filter members based on the query after the @ symbol.
  const filteredMembers: MentionUser[] = (members ?? []).filter((m) =>
    m.username.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Close the dropdown on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowMentions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionQuery, showMentions]);

  const findMentionQuery = (text: string, cursor: number): string | null => {
    const beforeCursor = text.slice(0, cursor);
    const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
    return match ? match[1] : null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursor = e.target.selectionStart ?? newValue.length;
    onChange(newValue);
    setCursorPos(newCursor);
    const query = findMentionQuery(newValue, newCursor);
    if (query !== null && communityId) {
      setMentionQuery(query);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (username: string) => {
    const beforeCursor = value.slice(0, cursorPos);
    const afterCursor = value.slice(cursorPos);
    // Remove the partial @query and insert @username + space.
    const updated =
      beforeCursor.replace(/(?:^|\s)@([a-zA-Z0-9_]*)$/, (match, _q) => {
        const prefix = match.startsWith("@") ? "" : " ";
        return `${prefix}@${username} `;
      }) + afterCursor;

    onChange(updated);
    setShowMentions(false);

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        const pos = updated.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || filteredMembers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filteredMembers.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (i) => (i - 1 + filteredMembers.length) % filteredMembers.length
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (filteredMembers[selectedIndex]) {
        e.preventDefault();
        insertMention(filteredMembers[selectedIndex].username);
      }
    } else if (e.key === "Escape") {
      setShowMentions(false);
    }
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Small delay so clicking a suggestion registers first.
          setTimeout(() => setShowMentions(false), 150);
        }}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className={
          className ??
          "w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)] focus:outline-none"
        }
      />

      {showMentions && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 z-30 mb-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg"
        >
          {membersLoading ? (
            <div className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">
              Loading members...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--color-text-secondary)]">
              No members found
            </div>
          ) : (
            filteredMembers.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m.username);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  i === selectedIndex
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
                }`}
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-[10px] font-bold text-white">
                  {m.image ? (
                    <img src={m.image} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    m.name.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="block truncate text-xs text-[var(--color-text-secondary)]">
                    @{m.username}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

