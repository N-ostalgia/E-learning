"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:3001`
    : "ws://localhost:3001");

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function useWebSocket(userId?: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("user_active", { userId, status: "online" });
      setIsActive(true);

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.connected) {
          socket.emit("user_heartbeat", { userId });
        }
      }, HEARTBEAT_INTERVAL);
    });

    socket.on("disconnect", (reason) => {
      setIsConnected(false);
      setIsActive(false);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (reason === "io server disconnect") {
        socket.connect();
      }
    });

    socket.on("connect_error", () => {
      setIsConnected(false);
      setIsActive(false);
    });

    // Presence updates from other users
    socket.on("user_activity", ({ userId: targetUserId, status, timestamp }) => {
      window.dispatchEvent(
        new CustomEvent("user_activity", {
          detail: { userId: targetUserId, status, timestamp },
        })
      );
    });

    // New message from the server
    socket.on("new_message", (data) => {
      window.dispatchEvent(
        new CustomEvent("new_message", {
          detail: data,
        })
      );
    });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        socket.emit("user_inactive", { userId });
        setIsActive(false);
      } else {
        socket.emit("user_active", { userId, status: "online" });
        setIsActive(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("user_activity");
      socket.off("new_message");

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);

      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return { socket: socketRef.current, isConnected, isActive };
}

/**
 * Hook to listen for a specific user's activity status.
 */
export function useUserActivity(userId: string) {
  const [status, setStatus] = useState<"online" | "away" | "offline">("offline");
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const { userId: targetUserId, status: newStatus, timestamp } = event.detail;
      if (targetUserId === userId) {
        setStatus(newStatus);
        setLastSeen(timestamp ? new Date(timestamp) : new Date());
      }
    };

    window.addEventListener("user_activity", handler as EventListener);
    return () => {
      window.removeEventListener("user_activity", handler as EventListener);
    };
  }, [userId]);

  return { status, lastSeen };
}