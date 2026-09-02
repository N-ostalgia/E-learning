// src/lib/websocket/index.ts
// Core WebSocket helpers: Socket.io server creation, Redis pub/sub publishing,
// and helpers to emit notifications to connected users.
import { Server as HTTPServer } from "http";
import { Server as SocketServer, type Socket } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import type { Notification } from "@/server/modules/notification/notification.types";
import { auth } from "@/server/modules/auth/auth.config";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Pub/Sub clients used to relay notifications across multiple server
// instances and to the standalone WebSocket relay server.
export const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: null });
export const subClient = pubClient.duplicate();

// The Socket.io channel used to fan out notifications to connected users.
export const NOTIFICATION_CHANNEL = "nexus:notifications";

let io: SocketServer | null = null;

export function initializeWebSocket(server: HTTPServer) {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Use the Redis adapter so multiple server instances share the same rooms.
  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    if (io) {
      io.adapter(createAdapter(pubClient, subClient));
    }
  });

  io.use(async (socket, next) => {
    try {
      const cookie = socket.handshake.headers.cookie;
      if (!cookie) {
        return next(new Error("Unauthorized"));
      }

      const session = await auth.api.getSession({
        headers: new Headers({ cookie }),
      });
      const userId = session?.user?.id;
      if (!userId) {
        return next(new Error("Unauthorized"));
      }

      socket.data.userId = userId;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    socket.on("disconnect", () => {
      // Nothing extra needed; Socket.io cleans up rooms automatically.
    });
  });

  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

/**
 * Emit a notification to a specific user's room (Socket.io).
 * Best-effort: returns false if the Socket.io server isn't running.
 */
export function emitToUser(userId: string, notification: Notification): boolean {
  if (!io) return false;
  io.to(`user:${userId}`).emit("new_notification", { notification });
  return true;
}

/**
 * Publish a notification to the Redis channel so that the standalone
 * WebSocket relay server (and other instances) can deliver it to the user.
 * Best-effort: never throws.
 */
export async function publishNotification(
  userId: string,
  notification: Notification
): Promise<void> {
  try {
    await pubClient.publish(
      NOTIFICATION_CHANNEL,
      JSON.stringify({ userId, notification })
    );
    // Also try direct Socket.io emission if this instance has the user connected.
    emitToUser(userId, notification);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to publish notification:", error);
  }
}
