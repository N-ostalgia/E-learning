import { db } from "@/lib/db";
import { redisConnection } from "@/lib/queue/redis-connection";
import { sql } from "drizzle-orm";

export async function GET() {
  const checks = { database: "ok", redis: "ok" } as Record<string, string>;
  try { await db.run(sql`SELECT 1`); } catch { checks.database = "down"; }
  try {
    await Promise.race([
      redisConnection.ping(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), 2000)),
    ]);
  } catch { checks.redis = "down"; }
  const healthy = Object.values(checks).every((status) => status === "ok");
  return Response.json({ status: healthy ? "ok" : "degraded", checks, timestamp: Date.now() }, { status: healthy ? 200 : 503 });
}

