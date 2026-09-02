"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faMessage,
  faChevronRight,
  faMagnifyingGlass,
  faCircle,
  faBan,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { useWebSocket } from "@/hooks/useWebSocket";

function formatListTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MessagesPage() {
  const router = useRouter();
  const { data: session } = trpc.auth.getSession.useQuery();
  const userId = session?.user?.id;
  const { socket, isConnected } = useWebSocket(userId);
  const [search, setSearch] = useState("");

  const { data: conversations, isLoading, isError, refetch } = trpc.message.getConversations.useQuery(
    undefined,
    { enabled: !!userId }
  );

  useEffect(() => {
    const handler = () => {
      refetch();
    };
    window.addEventListener("new_message", handler);
    return () => window.removeEventListener("new_message", handler);
  }, [refetch]);

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = (c.otherUser.name || c.otherUser.username || "").toLowerCase();
      return name.includes(q);
    });
  }, [conversations, search]);

  if (!session) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10">
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
            Sign in to view messages
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
          Messages
        </h1>
        {!isConnected && (
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            <FontAwesomeIcon icon={faCircle} className="h-1.5 w-1.5 animate-pulse text-current" />
            Connecting...
          </span>
        )}
      </div>

      {conversations && conversations.length > 0 && (
        <div className="relative mt-5">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
          />
        </div>
      )}

      <div className="mt-4 space-y-2">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-border)]" />
          ))
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-sm text-red-600">Failed to load conversations.</p>
            <button onClick={() => refetch()} className="mt-3 text-sm font-medium text-[var(--color-accent)] hover:underline">
              Try again
            </button>
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-soft)]">
              <FontAwesomeIcon icon={faMessage} className="h-6 w-6 text-[var(--color-accent)]" />
            </div>
            <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
              No conversations yet
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Start messaging someone from their profile.
            </p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
            No conversations match "{search}".
          </p>
        ) : (
          filteredConversations.map((conv) => {
            const isUnread = conv.unreadCount > 0 && !conv.isBlocked;
            const isBlockedConv = conv.isBlocked;

            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className={`block rounded-xl border p-4 transition-colors ${
                  isBlockedConv
                    ? "border-[var(--color-border)] bg-[var(--color-surface)] opacity-60 hover:opacity-80"
                    : isUnread
                      ? "border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full ${
                        isBlockedConv ? "grayscale" : ""
                      }`}
                    >
                      {conv.otherUser.image ? (
                        <img src={conv.otherUser.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                          <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`truncate ${
                            isUnread
                              ? "font-semibold text-[var(--color-text-primary)]"
                              : "font-medium text-[var(--color-text-primary)]"
                          }`}
                        >
                          {conv.otherUser.name || conv.otherUser.username}
                        </p>
                        {conv.lastMessage?.createdAt && (
                          <span className="flex-shrink-0 text-xs text-[var(--color-text-secondary)]">
                            · {formatListTimestamp(new Date(conv.lastMessage.createdAt))}
                          </span>
                        )}
                        {isBlockedConv && (
                          <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            <FontAwesomeIcon icon={faBan} className="h-3 w-3" />
                            Blocked
                          </span>
                        )}
                      </div>
                      <p
                        className={`truncate text-sm ${
                          isUnread
                            ? "font-medium text-[var(--color-text-primary)]"
                            : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {conv.lastMessage?.content || "No messages yet"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    {isUnread && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-semibold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="h-4 w-4 text-[var(--color-text-secondary)]"
                    />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}