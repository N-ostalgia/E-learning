// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || "./sqlite.db";
  const path = url.replace(/^["']|["']$/g, "");
  return path.startsWith("file:") ? path : `file:${path}`;
}

const client = createClient({ url: getDatabaseUrl() });

export const db = drizzle(client, { schema });
