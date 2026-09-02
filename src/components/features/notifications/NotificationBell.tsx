"use client";

import { useEffect, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { trpc } from "@/lib/trpc/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { NotificationDropdown } from "./NotificationDropdown";

export function NotificationBell() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const userId = session?.user?.id;
  const { socket, isConnected } = useWebSocket(userId);
  const utils = trpc.useUtils();

  const { data: unreadCount, refetch: refetchUnread } =
    trpc.notification.getUnreadCount.useQuery(undefined, {
      enabled: !!userId,
      refetchInterval: 30000,
    });

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handler = () => {
      refetchUnread();
      utils.notification.list.invalidate();
    };

    socket.on("new_notification", handler);
    return () => {
      socket.off("new_notification", handler);
    };
  }, [socket, refetchUnread, utils]);

  const count = unreadCount?.count ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="relative rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
        aria-label="Notifications"
      >
        <FontAwesomeIcon icon={faBell} className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
        {isConnected && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500" />
        )}
      </button>

      {open && (
        <NotificationDropdown
          onClose={() => setOpen(false)}
          onMarkAllRead={() => {
            refetchUnread();
            utils.notification.list.invalidate();
          }}
        />
      )}
    </div>
  );
}
