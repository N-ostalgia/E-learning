import type { badges } from "@/lib/db/schema";

export type Badge = typeof badges.$inferSelect;
export type NewBadge = typeof badges.$inferInsert;