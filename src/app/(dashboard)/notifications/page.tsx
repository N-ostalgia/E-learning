"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBellSlash,
  faCheckDouble,
  faCheck,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import type { Notification } from "@/server/modules/notification/notification.types";

type Filter = "all" | "unread";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type GroupKey = "Today" | "Yesterday" | "This Week" | "Older";

function groupKey(date: Date | string | number): GroupKey {
  const d = new Date(date);
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const day = startOfDay(d);
  if (day.getTime() >= today.getTime()) return "Today";
  if (day.getTime() >= yesterday.getTime()) return "Yesterday";
  if (day.getTime() >= weekAgo.getTime()) return "This Week";
  return "Older";
}

function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function formatTime(date: Date | string | number): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function Avatar({ name, image }: { name: string; image?: string | null }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<Filter>("all");
  const { data: session } = trpc.auth.getSession.useQuery();

  const listQuery = trpc.notification.list.useInfiniteQuery(
    { limit: 20, filter },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialCursor: undefined,
    }
  );

  const markAllMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: async () => {
      await utils.notification.list.invalidate();
      await utils.notification.getUnreadCount.invalidate();
      toast.success("All notifications marked as read.");
    },
    onError: (err) => toast.error(err.message || "Failed to mark all as read."),
  });

  const markReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: async () => {
      await utils.notification.list.invalidate();
      await utils.notification.getUnreadCount.invalidate();
    },
  });

  const deleteMutation = trpc.notification.delete.useMutation({
    onSuccess: async () => {
      await utils.notification.list.invalidate();
      await utils.notification.getUnreadCount.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to delete notification."),
  });

  const notifications = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [listQuery.data]
  );

  const handleNavigate = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate({ ids: [notification.id] });
    }
    router.push(notification.link);
  };

  const grouped = useMemo(() => {
    const map = new Map<GroupKey, Notification[]>();
    for (const n of notifications) {
      const key = groupKey(n.createdAt);
      const arr = map.get(key) ?? [];
      arr.push(n);
      map.set(key, arr);
    }
    return map;
  }, [notifications]);

  const groupOrder: GroupKey[] = ["Today", "Yesterday", "This Week", "Older"];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
            Notifications
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Stay up to date with your communities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
            {(["all", "unread"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {f === "all" ? "All" : "Unread"}
              </button>
            ))}
          </div>
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending || notifications.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)] disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faCheckDouble} className="h-4 w-4 text-current" />
            Mark all read
          </button>
        </div>
      </div>

      {!session?.user ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
          <FontAwesomeIcon
            icon={faBellSlash}
            className="mx-auto h-10 w-10 text-[var(--color-text-secondary)]"
          />
          <h3 className="mt-3 font-display text-lg font-semibold text-[var(--color-text-primary)]">
            Sign in to view notifications
          </h3>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Sign in
          </Link>
        </div>
      ) : listQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-border)]" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
          <FontAwesomeIcon
            icon={faBellSlash}
            className="mx-auto h-10 w-10 text-[var(--color-text-secondary)]"
          />
          <h3 className="mt-3 font-display text-lg font-semibold text-[var(--color-text-primary)]">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {filter === "unread"
              ? "You're all caught up!"
              : "When someone interacts with your posts or communities, you'll see it here."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupOrder
            .filter((key) => (grouped.get(key)?.length ?? 0) > 0)
            .map((key) => (
              <div key={key}>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  {key}
                </h2>
                <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  {(grouped.get(key) ?? []).map((notification, idx, arr) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-bg)] ${
                        idx < arr.length - 1 ? "border-b border-[var(--color-border)]" : ""
                      } ${notification.isRead ? "" : "bg-[var(--color-accent-soft)]/40"}`}
                    >
                      <button
                        onClick={() => handleNavigate(notification)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <Avatar
                          name={notification.actor?.name || "Nexus"}
                          image={notification.actor?.image}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-[var(--color-text-primary)]">
                            {notification.message}
                          </p>
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {formatDate(notification.createdAt)} · {formatTime(notification.createdAt)}
                          </span>
                        </div>
                        {!notification.isRead && (
                          <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--color-accent)]" />
                        )}
                      </button>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        {!notification.isRead && (
                          <button
                            onClick={() => markReadMutation.mutate({ ids: [notification.id] })}
                            disabled={markReadMutation.isPending}
                            title="Mark as read"
                            className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)] disabled:opacity-50"
                          >
                            <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5 text-current" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate({ id: notification.id })}
                          disabled={deleteMutation.isPending}
                          title="Delete"
                          className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5 text-current" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {listQuery.hasNextPage && (
            <button
              onClick={() => listQuery.fetchNextPage()}
              disabled={listQuery.isFetchingNextPage}
              className="mx-auto block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)] disabled:opacity-50"
            >
              {listQuery.isFetchingNextPage ? "Loading more..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
