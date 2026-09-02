"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckDouble, faBell } from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import type { Notification } from "@/server/modules/notification/notification.types";

function formatRelative(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Avatar({ name, image }: { name: string; image?: string | null }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

interface NotificationDropdownProps {
  onClose: () => void;
  onMarkAllRead: () => void;
}

export function NotificationDropdown({
  onClose,
  onMarkAllRead,
}: NotificationDropdownProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const ref = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = trpc.notification.list.useQuery({
    limit: 10,
    filter: "all",
  });

  const markAllMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: async () => {
      await utils.notification.list.invalidate();
      await utils.notification.getUnreadCount.invalidate();
      onMarkAllRead();
    },
    onError: (err) => toast.error(err.message || "Failed to mark all as read."),
  });

  const markReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: async () => {
      await utils.notification.list.invalidate();
      await utils.notification.getUnreadCount.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to mark notification as read."),
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleNavigate = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate({ ids: [notification.id] });
    }
    onClose();
    try {
      const url = new URL(notification.link, window.location.origin);
      if (url.hash) {
        // If navigating to the same pathname, just update the hash to trigger scrolling.
        if (window.location.pathname === url.pathname) {
          window.location.hash = url.hash;
        } else {
          // Use full navigation to ensure the hash is preserved on load
          window.location.href = notification.link;
        }
      } else {
        router.push(notification.link);
      }
    } catch (err) {
      router.push(notification.link);
    }
  };

  const items = data?.items ?? [];

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          Notifications
        </span>
        <button
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending || items.length === 0}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faCheckDouble} className="h-3 w-3 text-current" />
          Mark all as read
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading && (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-[var(--color-border)]" />
            ))}
          </div>
        )}

        {isError && (
          <p className="p-6 text-center text-sm text-red-600">
            Failed to load notifications. Please try again.
          </p>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <FontAwesomeIcon
              icon={faBell}
              className="h-8 w-8 text-[var(--color-text-secondary)]"
            />
            <p className="text-sm text-[var(--color-text-secondary)]">
              No notifications yet
            </p>
          </div>
        )}

        {!isLoading && !isError &&
          items.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNavigate(notification)}
              className={`flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg)] ${
                notification.isRead ? "" : "bg-[var(--color-accent-soft)]/40"
              }`}
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
                  {formatRelative(notification.createdAt)}
                </span>
              </div>
              {!notification.isRead && (
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--color-accent)]" />
              )}
            </button>
          ))}
      </div>

      <Link
        href="/notifications"
        onClick={onClose}
        className="block border-t border-[var(--color-border)] px-4 py-2.5 text-center text-sm font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-bg)]"
      >
        View all notifications
      </Link>
    </div>
  );
}
