// src/lib/queue/redis-connection.ts
//
// Dedicated Redis connection helpers for BullMQ.
// BullMQ accepts a URL string (or an object with `url`) to avoid type conflicts
// with ioredis instances. We keep a separate ioredis instance for other uses.

import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// For BullMQ: use this string directly
export const REDIS_URL = redisUrl;

// If you need an ioredis instance elsewhere (e.g., for custom Redis commands),
// export a dedicated instance. BullMQ will not use this to avoid version mismatches.
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});