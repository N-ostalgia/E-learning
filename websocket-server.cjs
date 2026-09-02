// websocket-server.cjs
const { createServer } = require("http");
const { Server: SocketServer } = require("socket.io");
const Redis = require("ioredis");
const { createAdapter } = require("@socket.io/redis-adapter");

const PORT = Number(process.env.WS_PORT || 3001);
const WS_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const NOTIFICATION_CHANNEL = "nexus:notifications";

const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: null });
const subClient = pubClient.duplicate();

const httpServer = createServer();
const io = new SocketServer(httpServer, {
  cors: {
    origin: WS_URL,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// ---------- User presence ----------
const activeUsers = new Map();
const CLEANUP_INTERVAL = 60000;
const OFFLINE_THRESHOLD = 60000;

setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of activeUsers) {
    if (now - data.lastSeen > OFFLINE_THRESHOLD) {
      activeUsers.set(userId, { ...data, status: "offline" });
      io.emit("user_activity", {
        userId,
        status: "offline",
        timestamp: now,
      });
    }
  }
}, CLEANUP_INTERVAL);

// ---------- Redis and WebSocket ----------
async function start() {
  try {
    io.adapter(createAdapter(pubClient, subClient));
  } catch (err) {
    console.error("[websocket] Failed to set up Redis adapter:", err);
  }

  io.use(async (socket, next) => {
    try {
      const cookie = socket.handshake.headers.cookie;
      if (!cookie) return next(new Error("Unauthorized"));

      const response = await fetch(`${WS_URL}/api/auth/get-session`, {
        headers: { cookie },
      });
      if (!response.ok) return next(new Error("Unauthorized"));

      const session = await response.json();
      const userId = session?.user?.id;
      if (!userId) return next(new Error("Unauthorized"));

      socket.data.userId = userId;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    // Presence events...
    socket.on("user_heartbeat", ({ userId: heartbeatUserId }) => {
      if (heartbeatUserId !== userId) return;
      const now = Date.now();
      const current = activeUsers.get(userId);
      const wasOffline = !current || current.status === "offline";
      activeUsers.set(userId, { lastSeen: now, status: "online" });
      if (wasOffline) {
        socket.broadcast.emit("user_activity", {
          userId,
          status: "online",
          timestamp: now,
        });
      }
    });

    socket.on("user_active", ({ userId: activeUserId, status }) => {
      if (activeUserId !== userId) return;
      const now = Date.now();
      const previous = activeUsers.get(userId)?.status;
      activeUsers.set(userId, { lastSeen: now, status: status || "online" });
      if (previous !== status) {
        socket.broadcast.emit("user_activity", {
          userId,
          status: status || "online",
          timestamp: now,
        });
      }
    });

    socket.on("user_inactive", ({ userId: inactiveUserId }) => {
      if (inactiveUserId !== userId) return;
      const current = activeUsers.get(userId);
      if (current && current.status !== "away") {
        activeUsers.set(userId, { ...current, status: "away" });
        socket.broadcast.emit("user_activity", {
          userId,
          status: "away",
          timestamp: Date.now(),
        });
      }
    });

    socket.on("join_community", ({ communityId }) => {
      if (communityId) socket.join(`community:${communityId}:members`);
    });
    socket.on("leave_community", ({ communityId }) => {
      if (communityId) socket.leave(`community:${communityId}:members`);
    });

    // Messaging
    socket.on("send_message", async (data, callback) => {
      try {
        const { conversationId, content } = data;
        if (!userId || !conversationId || !content) {
          return callback({ success: false, error: "Invalid data" });
        }
        const { sendMessage } = await import("./src/server/modules/message/message.service.js");
        const msg = await sendMessage(userId, conversationId, content);

        const { db } = await import("./src/lib/db/index.js");
        const { conversations } = await import("./src/lib/db/schema.js");
        const { eq } = await import("drizzle-orm");
        const conv = await db.query.conversations.findFirst({
          where: eq(conversations.id, conversationId),
        });
        if (!conv) return callback({ success: false, error: "Conversation not found" });
        const otherUserId = conv.userId1 === userId ? conv.userId2 : conv.userId1;

        io.to(`user:${otherUserId}`).emit("new_message", { conversationId, message: msg });
        io.to(`user:${userId}`).emit("new_message", { conversationId, message: msg });
        callback({ success: true, message: msg });
      } catch (error) {
        console.error("[websocket] send_message error:", error);
        callback({ success: false, error: error.message });
      }
    });
  });

  // Redis pub/sub – forward notifications
  await subClient.subscribe(NOTIFICATION_CHANNEL);
  subClient.on("message", (_channel, message) => {
    try {
      const { userId: notificationUserId, notification } = JSON.parse(message);
      if (notificationUserId && notification) {
        io.to(`user:${notificationUserId}`).emit("new_notification", { notification });
      }
    } catch {}
  });

  httpServer.listen(PORT, () => {
    console.log(`[websocket] Relay server running on port ${PORT}`);
  });
}

start();

process.on("SIGINT", async () => {
  console.log("[websocket] Shutting down...");
  await subClient.quit();
  await pubClient.quit();
  io.close();
  process.exit(0);
});