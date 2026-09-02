// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || "./sqlite.db";
  const path = url.replace(/^["']|["']$/g, "");
  return path.startsWith("file:") ? path : `file:${path}`;
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
