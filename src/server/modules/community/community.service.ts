// src/server/modules/community/community.service.ts
import { db } from "@/lib/db";
import { communities, communityMembers, users, subscriptions } from "@/lib/db/schema";
import { and, eq, like, sql, desc, lt, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { checkPlatformAccess } from "@/server/modules/payment/payment.service";
import Stripe from "stripe";

import type {
  CommunityWithMemberCount,
  CommunityDetail,
  ListCommunitiesInput,
  CreateCommunityInput,
  CommunityMemberInfo,
} from "./community.types";
import { generateSlug } from "./community.utils";
import { createNotification } from "@/server/modules/notification/notification.service";
import { checkAndAwardBadges } from "@/server/modules/badge/badge.service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-06-24.dahlia",
});

const COMMUNITY_FIELDS = {
  id: communities.id,
  name: communities.name,
  slug: communities.slug,
  description: communities.description,
  avatarUrl: communities.avatarUrl,
  coverUrl: communities.coverUrl,
  ownerId: communities.ownerId,
  isPublic: communities.isPublic,
  category: communities.category,
  settings: communities.settings,
  price: communities.price,
  stripePriceId: communities.stripePriceId,
  stripeProductId: communities.stripeProductId,
  createdAt: communities.createdAt,
  updatedAt: communities.updatedAt,
};

// ============================================================
// SHARED REMOVE MEMBER FUNCTION (cancels subscription + removes membership)
// ============================================================
export async function removeMemberFromCommunity(
  userId: string,
  communityId: string
): Promise<void> {
  const member = await db.query.communityMembers.findFirst({
    where: and(
      eq(communityMembers.userId, userId),
      eq(communityMembers.communityId, communityId)
    ),
  });

  if (!member || member.status !== "active") {
    throw new TRPCError({ code: "NOT_FOUND", message: "Member not found or not active" });
  }

  // Find and cancel subscription
  const subscription = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.communityId, communityId),
        eq(subscriptions.status, "active")
      )
    )
    .limit(1)
    .then((r) => r[0]);

  if (subscription?.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      console.log("Canceled Stripe subscription:", subscription.stripeSubscriptionId);
    } catch (err) {
      console.error("Failed to cancel Stripe subscription:", err);
      // Continue anyway – best effort
    }
  }

  // Delete the membership
  await db
    .delete(communityMembers)
    .where(eq(communityMembers.id, member.id));

  // Mark subscription as canceled in DB if exists
  if (subscription) {
    await db
      .update(subscriptions)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(subscriptions.id, subscription.id));
  }
}

export async function listCommunities(
  params: ListCommunitiesInput,
  currentUserId?: string | null
): Promise<{ items: CommunityWithMemberCount[]; nextCursor: string | null }> {
  const { limit, cursor, search, category } = params;
  const conditions: ReturnType<typeof and>[] = [];

  if (search) {
    const sanitizedSearch = search.replace(/[%_]/g, "\\$&");
    conditions.push(
      or(
        like(communities.name, `%${sanitizedSearch}%`),
        like(communities.description, `%${sanitizedSearch}%`)
      )
    );
  }

  if (category) {
    conditions.push(eq(communities.category, category));
  }

  if (cursor) {
    conditions.push(lt(communities.createdAt, new Date(Number(cursor))));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const memberCountSubquery = sql<number>`
    (SELECT COUNT(*) FROM community_members
     WHERE community_members.community_id = communities.id
     AND community_members.status = 'active')
  `;

  const isMemberSubquery = currentUserId
    ? sql<boolean>`
        EXISTS (
          SELECT 1 FROM community_members
          WHERE community_members.community_id = communities.id
          AND community_members.user_id = ${currentUserId}
          AND community_members.status = 'active'
        )
      `
    : sql<boolean>`0`;

  const memberStatusSubquery = currentUserId
    ? sql<string | null>`
        (SELECT community_members.status FROM community_members
         WHERE community_members.community_id = communities.id
         AND community_members.user_id = ${currentUserId}
         LIMIT 1)
      `
    : sql<string | null>`NULL`;

  const memberRoleSubquery = currentUserId
    ? sql<string | null>`
        (SELECT community_members.role FROM community_members
         WHERE community_members.community_id = communities.id
         AND community_members.user_id = ${currentUserId}
         LIMIT 1)
      `
    : sql<string | null>`NULL`;

  const rows = await db
    .select({
      ...COMMUNITY_FIELDS,
      memberCount: memberCountSubquery,
      isMember: isMemberSubquery,
      memberStatus: memberStatusSubquery,
      memberRole: memberRoleSubquery,
    })
    .from(communities)
    .where(whereClause)
    .orderBy(desc(communities.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];
  const nextCursor =
    hasMore && lastItem ? String(lastItem.createdAt.getTime()) : null;

  const itemsWithOwnerAsMember = items.map((item) => ({
    ...item,
    isMember: Boolean(item.isMember) || (currentUserId ? item.ownerId === currentUserId : false),
  })) as CommunityWithMemberCount[];

  return {
    items: itemsWithOwnerAsMember,
    nextCursor,
  };
}

export async function getCommunityBySlug(
  slug: string,
  currentUserId?: string | null
): Promise<CommunityDetail | null> {
  const memberCountSubquery = sql<number>`
    (SELECT COUNT(*) FROM community_members
     WHERE community_members.community_id = communities.id
     AND community_members.status = 'active')
  `;

  const rows = await db
    .select({
      ...COMMUNITY_FIELDS,
      ownerUsername: users.username,
      memberCount: memberCountSubquery,
      isMember: currentUserId
        ? sql<boolean>`
            EXISTS (
              SELECT 1 FROM community_members
              WHERE community_members.community_id = communities.id
              AND community_members.user_id = ${currentUserId}
              AND community_members.status = 'active'
            )
          `
        : sql<boolean>`0`,
      isOwner: currentUserId
        ? sql<boolean>`${communities.ownerId} = ${currentUserId}`
        : sql<boolean>`0`,
      membershipRole: currentUserId
        ? sql<string | null>`
            (SELECT community_members.role FROM community_members
             WHERE community_members.community_id = communities.id
             AND community_members.user_id = ${currentUserId}
             LIMIT 1)
          `
        : sql<string | null>`NULL`,
      membershipStatus: currentUserId
        ? sql<string | null>`
            (SELECT community_members.status FROM community_members
             WHERE community_members.community_id = communities.id
             AND community_members.user_id = ${currentUserId}
             LIMIT 1)
          `
        : sql<string | null>`NULL`,
    })
    .from(communities)
    .leftJoin(users, eq(users.id, communities.ownerId))
    .where(eq(communities.slug, slug))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  const isOwner = Boolean(row.isOwner);
  const isMember = Boolean(row.isMember) || isOwner;

  if (!isMember) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      avatarUrl: row.avatarUrl,
      ownerUsername: row.ownerUsername,
      isPublic: row.isPublic,
      price: row.price,
      memberCount: row.memberCount,
      isMember: false,
      isOwner: false,
      membership: null,
    };
  }

  return {
    ...row,
    isMember,
    isOwner,
    membership:
      row.membershipRole && row.membershipStatus
        ? { role: row.membershipRole, status: row.membershipStatus }
        : isOwner
          ? { role: "owner", status: "active" }
          : null,
  } as unknown as CommunityDetail;
}

export async function checkMembership(userId: string, communityId: string) {
  const member = await db.query.communityMembers.findFirst({
    where: and(
      eq(communityMembers.userId, userId),
      eq(communityMembers.communityId, communityId)
    ),
  });

  return {
    isMember: !!member && member.status === "active",
    isAdmin: member?.role === "admin",
    isOwner: member?.role === "owner",
    isModerator: member?.role === "moderator",
    status: member?.status || null,
    joinedAt: member?.joinedAt || null,
    role: member?.role || null,
  };
}

export async function joinCommunity(
  userId: string,
  communityId: string
): Promise<{ status: string; role: string }> {
  const community = await db
    .select()
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1);

  if (community.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Community not found.",
    });
  }

  const communityData = community[0];

  const existing = await db
    .select()
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.userId, userId),
        eq(communityMembers.communityId, communityId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const member = existing[0];
    if (member.status === "active") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You are already a member of this community.",
      });
    }
    if (member.status === "pending") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Your membership request is pending approval.",
      });
    }
  }

  if (communityData.price && communityData.price > 0) {
    throw new TRPCError({
      code: "PAYMENT_REQUIRED",
      message: "This community requires payment to join.",
    });
  }

  const status = communityData.isPublic ? "active" : "pending";
  const now = new Date();

  if (existing.length > 0) {
    await db
      .update(communityMembers)
      .set({ status, joinedAt: now })
      .where(eq(communityMembers.id, existing[0].id));
  } else {
    await db.insert(communityMembers).values({
      id: randomUUID(),
      userId,
      communityId,
      role: "member",
      status,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  try {
    const owner = await db
      .select({ ownerId: communities.ownerId, name: communities.name, slug: communities.slug })
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1)
      .then((r) => r[0]);

    if (owner && owner.ownerId && owner.ownerId !== userId) {
      if (status === "active") {
        await createNotification({
          userId: owner.ownerId,
          type: "join",
          actorId: userId,
          targetType: "community",
          targetId: communityId,
          message: `Someone joined your community ${owner.name}`,
          link: `/community/${owner.slug}`,
        });
      } else if (status === "pending") {
        await createNotification({
          userId: owner.ownerId,
          type: "request",
          actorId: userId,
          targetType: "community",
          targetId: communityId,
          message: `New membership request for ${owner.name}`,
          link: `/community/${owner.slug}`,
        });
      }
    }
  } catch (err) {
    console.error("Failed to notify community owner:", err);
  }

  return { status, role: "member" };
}

export async function leaveCommunity(
  userId: string,
  communityId: string
): Promise<void> {
  // Check if user is admin or owner (they cannot leave)
  const member = await db.query.communityMembers.findFirst({
    where: and(
      eq(communityMembers.userId, userId),
      eq(communityMembers.communityId, communityId)
    ),
  });

  if (!member || member.status !== "active") {
    throw new TRPCError({ code: "NOT_FOUND", message: "You are not an active member" });
  }

  if (member.role === "admin" || member.role === "owner") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admins and owners cannot leave the community" });
  }

  // Use shared removal logic
  await removeMemberFromCommunity(userId, communityId);
}

export async function createCommunity(
  userId: string,
  data: CreateCommunityInput
): Promise<typeof communities.$inferSelect> {
  // Step 1: Check if user has active platform subscription
  const hasAccess = await checkPlatformAccess(userId);
  if (!hasAccess) {
    throw new TRPCError({
      code: "PAYMENT_REQUIRED",
      message: "You need an active Nexus Pro subscription to create a community.",
    });
  }

  const now = new Date();
  let slug = generateSlug(data.name);
  let attempts = 0;
  const maxAttempts = 5;
  
  let stripeProductId: string | null = null;
  let stripePriceId: string | null = null;

  // Step 2: If community is paid, handle Stripe setup
  if (data.price && data.price > 0) {
    try {
      // Step 2a: Check if user has Stripe Connect account
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then((r) => r[0]);

      // Step 2b: Create Stripe Connect account if needed
      let stripeAccountId = user?.stripeAccountId;
      
      if (!stripeAccountId) {
        console.log("Creating Stripe Connect account for user:", userId);
        
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: user?.email || undefined,
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
         },
        });
        
        stripeAccountId = account.id;
        
        await db
          .update(users)
          .set({
            stripeAccountId: stripeAccountId,
            stripeAccountStatus: "pending",
          })
          .where(eq(users.id, userId));
        
        console.log("Stripe Connect account created:", stripeAccountId);
        
        // Step 2c: Create account link for onboarding
        const accountLink = await stripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") + "/creator/connect",
          return_url: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") + "/create-community",
          type: "account_onboarding",
        });
        
        console.log("Account link created, redirect user to:", accountLink.url);
        
        // Step 2d: Return the onboarding URL to the frontend
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: `STRIPE_ONBOARDING_REQUIRED:${accountLink.url}`,
        });
      }

      // Step 2e: Check if Stripe account is active
      const account = await stripe.accounts.retrieve(stripeAccountId);
      if (!account.charges_enabled) {
        // Account exists but not active - create new account link
        const accountLink = await stripe.accountLinks.create({
          account: stripeAccountId,
          refresh_url: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") + "/creator/connect",
          return_url: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") + "/create-community",
          type: "account_onboarding",
        });
        
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: `STRIPE_ONBOARDING_REQUIRED:${accountLink.url}`,
        });
      }

      // Step 2f: Create Stripe product and price
      const product = await stripe.products.create({
        name: data.name,
        description: data.description || undefined,
      });
      stripeProductId = product.id;

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: data.price * 100,
        currency: "usd",
        recurring: {
          interval: "month",
        },
      });
      stripePriceId = price.id;
      
      console.log("Stripe product and price created:", stripeProductId, stripePriceId);
      
    } catch (error: any) {
      console.error("Failed to create Stripe Connect account or product:", error);
      
      // If the error is the onboarding redirect, re-throw it
      if (error.code === "PAYMENT_REQUIRED" && error.message.includes("STRIPE_ONBOARDING_REQUIRED")) {
        throw error;
      }
      
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Failed to configure payment for community. Please try again.",
      });
    }
  }

  // Step 3: Create the community in database
  while (attempts < maxAttempts) {
    try {
      const [community] = await db
        .insert(communities)
        .values({
          id: randomUUID(),
          name: data.name,
          slug,
          description: data.description ?? "",
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=10b981&color=fff&size=128`,
          ownerId: userId,
          isPublic: data.isPublic,
          price: data.price ?? null,
          stripeProductId: stripeProductId,
          stripePriceId: stripePriceId,
          category: data.category ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await db.insert(communityMembers).values({
        id: randomUUID(),
        userId,
        communityId: community.id,
        role: "owner",
        status: "active",
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      // Check and award badges for creating a community
      try {
        await checkAndAwardBadges(userId);
      } catch (error) {
        console.error("Failed to check and award badges after community creation:", error);
      }

      return community;
    } catch (error: any) {
      attempts++;
      if (
        attempts < maxAttempts &&
        error?.message?.includes("UNIQUE constraint failed")
      ) {
        slug = generateSlug(data.name);
        continue;
      }
      throw error;
    }
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to create community. Please try again.",
  });
}

export async function listMembers(
  communityId: string,
  currentUserId?: string | null
): Promise<CommunityMemberInfo[]> {
  const community = await db
    .select()
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!community) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Community not found.",
    });
  }

  if (currentUserId) {
    const membership = await checkMembership(currentUserId, communityId);
    const isOwner = community.ownerId === currentUserId;
    if (!membership.isMember && !isOwner) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You must be a member to see this community's members.",
      });
    }
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      image: users.image,
      bio: users.bio,
      role: communityMembers.role,
      joinedAt: communityMembers.joinedAt,
    })
    .from(communityMembers)
    .innerJoin(users, eq(users.id, communityMembers.userId))
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.status, "active")
      )
    )
    .orderBy(desc(communityMembers.joinedAt));

  return rows;
}

export async function updateCommunity(
  communityId: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    category?: string | null;
    isPublic?: boolean;
    avatarUrl?: string;
    coverUrl?: string;
  }
) {
  const community = await db
    .select()
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1)
    .then((r) => r[0]);

  if (!community) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Community not found" });
  }

  if (community.ownerId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the community owner can update this community",
    });
  }

  const [updated] = await db
    .update(communities)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(communities.id, communityId))
    .returning();

  return updated;
}

export async function getMyCommunities(userId: string): Promise<CommunityWithMemberCount[]> {
  const rows = await db
    .select({
      ...COMMUNITY_FIELDS,
      memberCount: sql<number>`
        (SELECT COUNT(*) FROM community_members
         WHERE community_members.community_id = communities.id
         AND community_members.status = 'active')
      `,
      isMember: sql<boolean>`1`,
      memberStatus: communityMembers.status,
      memberRole: communityMembers.role,
    })
    .from(communityMembers)
    .innerJoin(communities, eq(communityMembers.communityId, communities.id))
    .where(
      and(
        eq(communityMembers.userId, userId),
        eq(communityMembers.status, "active")
      )
    )
    .orderBy(desc(communityMembers.joinedAt));

  return rows as unknown as CommunityWithMemberCount[];
}

export async function updateCommunityPrice(userId: string, communityId: string, price: number | null) {
  const community = await db.select().from(communities).where(eq(communities.id, communityId)).limit(1).then(r => r[0]);
  if (!community) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Community not found" });
  }
  if (community.ownerId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the community owner can update the price",
    });
  }

  await db.update(communities).set({ price, updatedAt: new Date() }).where(eq(communities.id, communityId));

  return await db.select().from(communities).where(eq(communities.id, communityId)).limit(1).then(r => r[0]);
}

export async function deleteCommunityAndCancelSubscriptions(
  userId: string,
  communityId: string
) {
  // Check if user is the owner
  const community = await db
    .select()
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1)
    .then((r) => r[0]);

  if (!community) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Community not found",
    });
  }

  if (community.ownerId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the community owner can delete this community",
    });
  }

  // Get all active subscriptions for this community
  const activeSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.communityId, communityId),
        eq(subscriptions.status, "active")
      )
    );

  // Cancel each subscription in Stripe
  for (const sub of activeSubscriptions) {
    if (sub.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
        console.log("Canceled Stripe subscription:", sub.stripeSubscriptionId);
      } catch (err) {
        console.error("Failed to cancel Stripe subscription:", err);
      }
    }
  }

  // Update all subscriptions to canceled
  if (activeSubscriptions.length > 0) {
    await db
      .update(subscriptions)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(subscriptions.communityId, communityId));
  }

  // Delete all community members
  await db
    .delete(communityMembers)
    .where(eq(communityMembers.communityId, communityId));

  // Delete the community
  await db
    .delete(communities)
    .where(eq(communities.id, communityId));

  // Delete Stripe product if exists
  if (community.stripeProductId) {
    try {
      await stripe.products.update(community.stripeProductId, { active: false });
      console.log("Deactivated Stripe product:", community.stripeProductId);
    } catch (err) {
      console.error("Failed to deactivate Stripe product:", err);
    }
  }

  return { success: true };
}