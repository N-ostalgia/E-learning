import { db } from "@/lib/db";
import { users, userReports, userBlocks } from "@/lib/db/schema"; 

import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";

export async function reportUser(
  reporterId: string,
  reportedUserId: string,
  reason: string,
  details?: string
) {
  if (reporterId === reportedUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot report yourself" });
  }

  // Check if user exists (we could skip, but let's do it)
  const reported = await db.query.users.findFirst({
    where: eq(users.id, reportedUserId),
  });
  if (!reported) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  const now = new Date();
  await db.insert(userReports).values({
    id: randomUUID(),
    reporterId,
    reportedUserId,
    reason,
    details: details || null,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });

  return { success: true };
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot block yourself" });
  }

  // Check if already blocked
  const existing = await db
    .select()
    .from(userBlocks)
    .where(
      and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new TRPCError({ code: "CONFLICT", message: "User is already blocked" });
  }

  await db.insert(userBlocks).values({
    id: randomUUID(),
    blockerId,
    blockedId,
    createdAt: new Date(),
  });

  return { success: true };
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await db
    .delete(userBlocks)
    .where(
      and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      )
    );
  return { success: true };
}

export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const result = await db
    .select()
    .from(userBlocks)
    .where(
      and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      )
    )
    .limit(1);
  return result.length > 0;
}