// src/server/modules/admin/admin.service.ts
import { db } from "@/lib/db";
import {
  reports,
  users,
  posts,
  comments,
  communities,
  communityMembers,
  session,
  account,
  platformSettings,
} from "@/lib/db/schema";
import type {
  ReportStatus,
  ReportWithDetails,
  UserWithStats,
  CommunityWithStats,
  PlatformStats,
  SettingsData,
} from "./admin.types";
import { and, eq, like, lt, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

function buildWhere(conds: ReturnType<typeof and> | undefined) {
  return conds;
}

export async function listReports(
  status?: ReportStatus,
  limit: number = 20,
  cursor?: string
): Promise<{ items: ReportWithDetails[]; nextCursor: string | null }> {
  const conditions: ReturnType<typeof and>[] = [];
  if (status) conditions.push(eq(reports.status, status));
  if (cursor) {
    const cursorTime = new Date(Number(cursor));
    if (Number.isNaN(cursorTime.getTime())) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid report cursor." });
    }
    conditions.push(lt(reports.createdAt, cursorTime));
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(reports)
    .where(buildWhere(whereClause))
    .orderBy(desc(reports.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? String(new Date(last.createdAt).getTime()) : null;

  const out: ReportWithDetails[] = [];

  for (const r of items) {
    const reporter = (await db.select().from(users).where(eq(users.id, r.reporterId)).then((res) => res[0])) as typeof users.$inferSelect | undefined;

    let targetContent = "";
    let author: typeof users.$inferSelect | undefined;
    let community: typeof communities.$inferSelect | undefined;
    let postId: string | undefined;

    if (r.targetType === "post") {
      const post = (await db.select().from(posts).where(eq(posts.id, r.targetId)).then((res) => res[0])) as typeof posts.$inferSelect | undefined;
      if (post) {
        targetContent = post.content;
        author = (await db.select().from(users).where(eq(users.id, post.authorId)).then((res) => res[0])) as typeof users.$inferSelect | undefined;
        if (post.communityId) {
          community = (await db.select().from(communities).where(eq(communities.id, post.communityId)).then((res) => res[0])) as typeof communities.$inferSelect | undefined;
        }
        postId = post.id;
      }
    } else {
      const comment = (await db.select().from(comments).where(eq(comments.id, r.targetId)).then((res) => res[0])) as typeof comments.$inferSelect | undefined;
      if (comment) {
        targetContent = comment.content;
        author = (await db.select().from(users).where(eq(users.id, comment.authorId)).then((res) => res[0])) as typeof users.$inferSelect | undefined;
        postId = comment.postId ?? undefined;
        if (postId) {
          const post = (await db.select().from(posts).where(eq(posts.id, postId)).then((res) => res[0])) as typeof posts.$inferSelect | undefined;
          if (post?.communityId) {
            community = (await db.select().from(communities).where(eq(communities.id, post.communityId)).then((res) => res[0])) as typeof communities.$inferSelect | undefined;
          }
        }
      }
    }

    out.push({
      id: r.id,
      reporterId: r.reporterId,
      targetType: r.targetType as "post" | "comment",
      targetId: r.targetId,
      reason: r.reason,
      details: null,
      status: r.status as ReportStatus,
      createdAt: new Date(r.createdAt),
      reporter: {
        id: reporter?.id ?? "",
        name: reporter?.name ?? "",
        username: reporter?.username ?? "",
        email: reporter?.email ?? "",
        image: reporter?.image ?? null,
      },
      target: {
        type: r.targetType as "post" | "comment",
        content: targetContent,
        authorId: author?.id ?? "",
        author: {
          id: author?.id ?? "",
          name: author?.name ?? "",
          username: author?.username ?? "",
          email: author?.email ?? "",
        },
        communityId: community?.id,
        community: community ? { id: community.id, name: community.name, slug: community.slug } : undefined,
        postId,
      },
    });
  }

  return { items: out, nextCursor };
}

export async function updateReportStatus(reportId: string, status: ReportStatus): Promise<{ success: boolean }> {
  const [updated] = await db.update(reports).set({ status }).where(eq(reports.id, reportId)).returning({ id: reports.id });
  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
  return { success: true };
}

export async function deleteContent(targetType: "post" | "comment", targetId: string): Promise<{ success: boolean }> {
  if (targetType === "post") {
    await db.delete(reports).where(eq(reports.targetId, targetId));
    await db.delete(posts).where(eq(posts.id, targetId));
  } else {
    await db.delete(reports).where(eq(reports.targetId, targetId));
    await db.delete(comments).where(eq(comments.id, targetId));
  }
  return { success: true };
}

export async function suspendUser(actorId: string, userId: string, durationMs?: number): Promise<{ success: boolean }> {
  const u = (await db.select().from(users).where(eq(users.id, userId)).then((r) => r[0])) as typeof users.$inferSelect | undefined;
  if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  const actor = await db.select({ globalRole: users.globalRole }).from(users).where(eq(users.id, actorId)).limit(1).then((r) => r[0]);
  if (actor?.globalRole !== "super_admin" && ["admin", "super_admin"].includes(u.globalRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only a super admin can suspend administrators" });
  }
  if (durationMs !== undefined && (!Number.isFinite(durationMs) || durationMs <= 0)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Suspension duration must be positive" });
  }
  const prev = u.globalRole === "suspended" ? (u.previousRole ?? "member") : u.globalRole;
  const suspendedUntil = durationMs ? Number(Date.now() + durationMs) : null;

  await db.update(users).set({ globalRole: "suspended", previousRole: prev, suspendedUntil: suspendedUntil as any }).where(eq(users.id, userId));
  return { success: true };
}

export async function unsuspendUser(actorId: string, userId: string): Promise<{ success: boolean }> {
  const u = (await db.select().from(users).where(eq(users.id, userId)).then((r) => r[0])) as typeof users.$inferSelect | undefined;
  if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  const actor = await db.select({ globalRole: users.globalRole }).from(users).where(eq(users.id, actorId)).limit(1).then((r) => r[0]);
  if (actor?.globalRole !== "super_admin" && ["admin", "super_admin"].includes(u.globalRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only a super admin can unsuspend administrators" });
  }
  const restore = u.previousRole ?? "member";
  await db.update(users).set({ globalRole: restore, previousRole: null, suspendedUntil: null }).where(eq(users.id, userId));
  return { success: true };
}

export async function listUsers(
  search?: string,
  role?: string,
  limit: number = 20,
  cursor?: string
): Promise<{ items: UserWithStats[]; nextCursor: string | null }> {
  const conditions: ReturnType<typeof and>[] = [];
  if (search) {
    const s = search.replace(/[%_]/g, "\\$&");
    conditions.push(like(users.name, `%${s}%`));
  }
  if (role) conditions.push(eq(users.globalRole, role));
  if (cursor) conditions.push(lt(users.createdAt, new Date(Number(cursor))));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? String(new Date(last.createdAt).getTime()) : null;

  const out: UserWithStats[] = [];

  for (const u of items) {
    const postCount = Number((await db.select({ count: sql<number>`COUNT(*)` }).from(posts).where(eq(posts.authorId, u.id))).at(0)?.count ?? 0);
    const commentCount = Number((await db.select({ count: sql<number>`COUNT(*)` }).from(comments).where(eq(comments.authorId, u.id))).at(0)?.count ?? 0);
    const communityCount = Number((await db.select({ count: sql<number>`COUNT(*)` }).from(communityMembers).where(eq(communityMembers.userId, u.id))).at(0)?.count ?? 0);
    const reportCount = Number((await db.select({ count: sql<number>`COUNT(*)` }).from(reports).where(eq(reports.reporterId, u.id))).at(0)?.count ?? 0);

    out.push({
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      image: u.image ?? null,
      globalRole: u.globalRole,
      emailVerified: Boolean(u.emailVerified),
      createdAt: new Date(u.createdAt),
      postCount,
      commentCount,
      communityCount,
      reportCount,
      isSuspended: u.globalRole === "suspended",
    });
  }

  return { items: out, nextCursor };
}

export async function updateUserRole(userId: string, role: string): Promise<{ success: boolean }> {
  const [updated] = await db.update(users).set({ globalRole: role }).where(eq(users.id, userId)).returning({ id: users.id });
  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  return { success: true };
}

export async function deleteUser(userId: string): Promise<{ success: boolean }> {
  await db.transaction(async (tx) => {
    await tx.delete(communityMembers).where(eq(communityMembers.userId, userId));
    await tx.delete(reports).where(eq(reports.reporterId, userId));
    await tx.delete(comments).where(eq(comments.authorId, userId));
    await tx.delete(posts).where(eq(posts.authorId, userId));

    const ownedCommunities = await tx.select().from(communities).where(eq(communities.ownerId, userId));
    for (const community of ownedCommunities) {
      await tx.delete(communityMembers).where(eq(communityMembers.communityId, community.id));
      await tx.delete(reports).where(eq(reports.targetId, community.id));
      await tx.delete(posts).where(eq(posts.communityId, community.id));
      await tx.delete(comments).where(eq(comments.postId, community.id));
      await tx.delete(communities).where(eq(communities.id, community.id));
    }

    await tx.delete(session).where(eq(session.userId, userId)).catch(() => {});
    await tx.delete(account).where(eq(account.userId, userId)).catch(() => {});
    await tx.delete(users).where(eq(users.id, userId));
  });

  return { success: true };
}

export async function listCommunities(
  search?: string,
  limit: number = 20,
  cursor?: string
): Promise<{ items: CommunityWithStats[]; nextCursor: string | null }> {
  const conditions: ReturnType<typeof and>[] = [];
  if (search) {
    const s = search.replace(/[%_]/g, "\\$&");
    conditions.push(like(communities.name, `%${s}%`));
  }
  if (cursor) conditions.push(lt(communities.createdAt, new Date(Number(cursor))));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(communities)
    .where(whereClause)
    .orderBy(desc(communities.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? String(new Date(last.createdAt).getTime()) : null;

  const out: CommunityWithStats[] = [];

  for (const c of items) {
    const owner = (await db.select().from(users).where(eq(users.id, c.ownerId)).then((r) => r[0])) as typeof users.$inferSelect | undefined;
    const memberCount = Number((await db.select({ count: sql<number>`COUNT(*)` }).from(communityMembers).where(eq(communityMembers.communityId, c.id))).at(0)?.count ?? 0);
    const postCount = Number((await db.select({ count: sql<number>`COUNT(*)` }).from(posts).where(eq(posts.communityId, c.id))).at(0)?.count ?? 0);

    out.push({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      avatarUrl: c.avatarUrl,
      ownerId: c.ownerId,
      ownerName: owner?.name ?? "",
      ownerUsername: owner?.username ?? "",
      memberCount,
      postCount,
      isPublic: Boolean(c.isPublic),
      isSuspended: false,
      createdAt: new Date(c.createdAt),
    });
  }

  return { items: out, nextCursor };
}

export async function deleteCommunity(communityId: string): Promise<{ success: boolean }> {
  await db.delete(communityMembers).where(eq(communityMembers.communityId, communityId));
  await db.delete(reports).where(eq(reports.targetId, communityId));
  await db.delete(posts).where(eq(posts.communityId, communityId));
  await db.delete(comments).where(eq(comments.postId, communityId));
  await db.delete(communities).where(eq(communities.id, communityId));
  return { success: true };
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const totalUsers = Number((await db.select({ count: sql<number>`COUNT(*)` }).from(users)).at(0)?.count ?? 0);
  const totalCommunities = Number((await db.select({ count: sql<number>`COUNT(*)` }).from(communities)).at(0)?.count ?? 0);
  const totalPosts = Number((await db.select({ count: sql<number>`COUNT(*)` }).from(posts)).at(0)?.count ?? 0);
  const totalComments = Number((await db.select({ count: sql<number>`COUNT(*)` }).from(comments)).at(0)?.count ?? 0);
  const totalReports = Number((await db.select({ count: sql<number>`COUNT(*)` }).from(reports)).at(0)?.count ?? 0);
  const pendingReports = Number((await db.select({ count: sql<number>`COUNT(*)` }).from(reports).where(eq(reports.status, "pending"))).at(0)?.count ?? 0);

  return {
    totalUsers,
    totalCommunities,
    totalPosts,
    totalComments,
    totalReports,
    pendingReports,
    usersToday: 0,
    communitiesToday: 0,
    postsToday: 0,
  };
}

export async function getSystemHealth(): Promise<{ db: string; error?: string }> {
  try {
    await db.select().from(users).limit(1);
    return { db: "ok" };
  } catch (err) {
    return { db: "error", error: String(err) };
  }
}

const DEFAULT_SETTINGS: SettingsData = {
  platformName: "Nexus",
  platformTagline: "Learn Together, Grow Together",
  supportEmail: "support@nexus.com",
  allowRegistration: true,
  defaultUserRole: "member",
  requireEmailVerification: true,
  usernameMinLength: 3,
  usernameMaxLength: 20,
  autoSuspendThreshold: 3,
  postApprovalRequired: false,
  commentApprovalRequired: false,
  maxCommunitiesPerUser: 10,
  defaultCommunityPrivacy: "public",
  gamificationEnabled: true,
  pointsForPost: 10,
  pointsForComment: 5,
  pointsForLikeReceived: 3,
  pointsForLessonComplete: 20,
  stripeMode: "test",
  platformFee: 10,
  minimumPayout: 25,
  welcomeEmailEnabled: true,
  notificationEmailEnabled: true,
  digestFrequency: "daily",
};

export async function getSettings(): Promise<SettingsData> {
  const row = await db
    .select({ settings: platformSettings.settings })
    .from(platformSettings)
    .where(eq(platformSettings.id, "default"))
    .limit(1);

  if (!row[0]) {
    await db.insert(platformSettings).values({
      id: "default",
      settings: JSON.stringify(DEFAULT_SETTINGS),
      updatedAt: new Date(),
    });
    return DEFAULT_SETTINGS;
  }

  return { ...DEFAULT_SETTINGS, ...JSON.parse(row[0].settings) };
}

export async function updateSettings(updated: Partial<SettingsData>): Promise<SettingsData> {
  const settings = { ...(await getSettings()), ...updated };
  await db
    .insert(platformSettings)
    .values({
      id: "default",
      settings: JSON.stringify(settings),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: platformSettings.id,
      set: { settings: JSON.stringify(settings), updatedAt: new Date() },
    });
  return settings;
}