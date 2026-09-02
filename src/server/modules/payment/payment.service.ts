// src/server/modules/payment/payment.service.ts
import Stripe from "stripe";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, inArray, desc, and, lt } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { PlatformPlan, PlatformSubscription } from "./payment.types";
import { TRPCError } from "@trpc/server";
import { getEnrollment, grantPaidCourseEnrollment } from "@/server/modules/course/course.service";

type DatabaseExecutor = typeof db;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
   apiVersion: "2026-06-24.dahlia",
});

const PLATFORM_PRICE_ID = process.env.NEXT_PUBLIC_PLATFORM_PRICE_ID;
const PLATFORM_SUCCESS_URL = process.env.PLATFORM_SUCCESS_URL || "http://localhost:3000/discover";
const PLATFORM_CANCEL_URL = process.env.PLATFORM_CANCEL_URL || "http://localhost:3000/discover";

export async function createCourseCheckout(userId: string, courseId: string) {
  const course = await db
    .select()
    .from(schema.courses)
    .where(eq(schema.courses.id, courseId))
    .limit(1)
    .then((r) => r[0]);

  if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
  if (!course.price || course.price <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Course is free" });
  }

  if (await getEnrollment(userId, courseId)) {
    throw new TRPCError({ code: "CONFLICT", message: "You are already enrolled in this course" });
  }

  const member = await db
    .select({ id: schema.communityMembers.id })
    .from(schema.communityMembers)
    .where(
      and(
        eq(schema.communityMembers.userId, userId),
        eq(schema.communityMembers.communityId, course.communityId),
        eq(schema.communityMembers.status, "active")
      )
    )
    .limit(1);
  if (!member.length) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Join the community before buying this course" });
  }

  const community = await db
    .select({ slug: schema.communities.slug })
    .from(schema.communities)
    .where(eq(schema.communities.id, course.communityId))
    .limit(1)
    .then((r) => r[0]);

  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        unit_amount: course.price,
        product_data: { name: course.title, description: course.description || undefined },
      },
      quantity: 1,
    }],
    metadata: { userId, courseId, type: "course_purchase" },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/community/${community?.slug || ""}/courses/${courseId}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/community/${community?.slug || ""}/courses/${courseId}?payment=cancelled`,
  });
}

function getSubscriptionPeriod(subscription: Stripe.Subscription): { currentPeriodStart: Date; currentPeriodEnd: Date | null } {
  const item = subscription.items.data[0];
  if (!item) {
    throw new Error("Subscription has no items");
  }

  const start = item.current_period_start;
  const end = item.current_period_end;

  return {
    currentPeriodStart: new Date(start * 1000),
    currentPeriodEnd: end ? new Date(end * 1000) : null,
  };
}

// PLATFORM SUBSCRIPTION (Creator Pays Platform)

export async function createPlatformCheckout(userId: string, plan: PlatformPlan = "pro") {
  if (plan !== "pro" && plan !== "enterprise") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid platform plan" });
  }
  if (!PLATFORM_PRICE_ID) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Platform price is not configured" });
  if (await checkPlatformAccess(userId)) {
    throw new TRPCError({ code: "CONFLICT", message: "You already have an active Nexus Pro subscription" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: PLATFORM_PRICE_ID,
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      plan,
      type: "platform_subscription",
    },
    success_url: PLATFORM_SUCCESS_URL + "?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: PLATFORM_CANCEL_URL,
  });

  return session;
}

export async function activatePlatformSubscription(
  userId: string,
  stripeSubscriptionId: string,
  database: DatabaseExecutor = db
) {
  const now = new Date();

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const period = getSubscriptionPeriod(subscription);

  const values = {
    userId,
    stripeSubscriptionId,
    status: subscription.status,
    plan: subscription.items.data[0]?.price?.nickname || "pro",
    amount: subscription.items.data[0]?.price?.unit_amount || 0,
    startsAt: period.currentPeriodStart,
    endsAt: period.currentPeriodEnd,
    updatedAt: now,
  };
  const existing = await database
    .select({ id: schema.platformSubscriptions.id })
    .from(schema.platformSubscriptions)
    .where(eq(schema.platformSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    await database.update(schema.platformSubscriptions).set(values).where(eq(schema.platformSubscriptions.id, existing.id));
  } else {
    await database.insert(schema.platformSubscriptions).values({
      id: randomUUID(),
      createdAt: now,
      ...values,
    });
  }

  await db
    .update(schema.users)
    .set({
      isPlatformSubscribed: true,
      platformSubscriptionId: stripeSubscriptionId,
    })
    .where(eq(schema.users.id, userId));

  return true;
}

export async function cancelPlatformSubscription(userId: string) {
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)
    .then((r) => r[0]);

  if (!user || !user.platformSubscriptionId) return false;

  await stripe.subscriptions.cancel(user.platformSubscriptionId);

  await db
    .update(schema.platformSubscriptions)
    .set({ status: "canceled" })
    .where(eq(schema.platformSubscriptions.stripeSubscriptionId, user.platformSubscriptionId));

  await db
    .update(schema.users)
    .set({ isPlatformSubscribed: false, platformSubscriptionId: null })
    .where(eq(schema.users.id, userId));

  return true;
}

export async function getPlatformSubscriptionStatus(userId: string) {
  const sub = await db
    .select()
    .from(schema.platformSubscriptions)
    .where(eq(schema.platformSubscriptions.userId, userId))
    .limit(1)
    .then((r) => r[0]);
  return sub || null;
}

export async function checkPlatformAccess(userId: string) {
  const rows = await db
    .select()
    .from(schema.platformSubscriptions)
    .where(eq(schema.platformSubscriptions.userId, userId))
    .then((r) => r);

  if (!rows || rows.length === 0) return false;

  const now = new Date();
  const active = rows.find((r) => r.status === "active" && (!r.endsAt || r.endsAt > now));
  return !!active;
}

// STRIPE CONNECT ONBOARDING

export async function createConnectOnboarding(userId: string) {
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)
    .then((r) => r[0]);

  if (!user) throw new Error("User not found");

  let accountId = user.stripeAccountId;

  if (!accountId) {
    const acct = await stripe.accounts.create({
      type: "express",
      country: process.env.STRIPE_DEFAULT_COUNTRY || "US",
      email: user.email || undefined,
      capabilities: { 
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });

    accountId = acct.id;

    await db
      .update(schema.users)
      .set({
        stripeAccountId: accountId,
        stripeAccountStatus: "pending",
      })
      .where(eq(schema.users.id, userId));
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url:
      process.env.STRIPE_ONBOARDING_REFRESH_URL ||
      (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") + "/creator/connect",
    return_url:
      process.env.STRIPE_ONBOARDING_RETURN_URL ||
      (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") + "/create-community",
    type: "account_onboarding",
  });

  return { url: accountLink.url, accountId };
}

// COMMUNITY SUBSCRIPTION (Member Pays Creator)

export async function createCommunityCheckout(
  userId: string,
  data: { communityId: string }
) {
  const community = await db
    .select()
    .from(schema.communities)
    .where(eq(schema.communities.id, data.communityId))
    .limit(1)
    .then((r) => r[0]);

  if (!community) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Community not found" });
  }

  const priceId = community.stripePriceId;
  if (!priceId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Community is not configured with a Stripe price ID" });
  }

  const creator = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, community.ownerId))
    .limit(1)
    .then((r) => r[0]);

  if (!creator) throw new TRPCError({ code: "NOT_FOUND", message: "Creator not found" });
  if (!creator.stripeAccountId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Creator has not connected Stripe account" });
  }

  if (!community.stripeProductId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Community is missing its Stripe product" });
  }

  const membership = await db
    .select({ id: schema.communityMembers.id })
    .from(schema.communityMembers)
    .where(
      and(
        eq(schema.communityMembers.userId, userId),
        eq(schema.communityMembers.communityId, data.communityId),
        eq(schema.communityMembers.status, "active")
      )
    )
    .limit(1);
  if (membership.length > 0) {
    throw new TRPCError({ code: "CONFLICT", message: "You are already a member of this community" });
  }

  const existingSubscription = await db
    .select({ id: schema.subscriptions.id })
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.communityId, data.communityId),
        eq(schema.subscriptions.status, "active")
      )
    )
    .limit(1);
  if (existingSubscription.length > 0) {
    throw new TRPCError({ code: "CONFLICT", message: "You already have an active subscription to this community" });
  }

  const price = await stripe.prices.retrieve(priceId);
  const productId = typeof price.product === "string" ? price.product : price.product.id;
  if (productId !== community.stripeProductId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Stripe price does not belong to this community" });
  }

  // Get community slug for redirect
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_types: ["card"],
    metadata: {
      userId,
      communityId: data.communityId,
      creatorId: community.ownerId,
      type: "community_subscription",
    },
    success_url: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") + `/community/${community.slug}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: PLATFORM_CANCEL_URL,
  });

  return session;
}

export async function activateCommunitySubscription(
  userId: string,
  communityId: string,
  stripeSubscriptionId: string,
  database: DatabaseExecutor = db
) {
  const now = new Date();
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const period = getSubscriptionPeriod(subscription);

  const amount = subscription.items.data[0]?.price?.unit_amount || 0;
  const values = {
    userId,
    communityId,
    stripeSubscriptionId,
    status: subscription.status,
    amount,
    startsAt: period.currentPeriodStart,
    endsAt: period.currentPeriodEnd,
    updatedAt: now,
  };
  const existing = await database
    .select({ id: schema.subscriptions.id })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    await database.update(schema.subscriptions).set(values).where(eq(schema.subscriptions.id, existing.id));
  } else {
    await database.insert(schema.subscriptions).values({
      id: randomUUID(),
      createdAt: now,
      ...values,
    });
  }

  await grantMemberAccess(userId, communityId, database);

  return true;
}

// MEMBER ACCESS MANAGEMENT

export async function grantMemberAccess(
  userId: string,
  communityId: string,
  database: DatabaseExecutor = db
) {
  const exists = await database
    .select()
    .from(schema.communityMembers)
    .where(
      and(
        eq(schema.communityMembers.userId, userId),
        eq(schema.communityMembers.communityId, communityId)
      )
    )
    .limit(1)
    .then((r) => r[0]);

  const now = new Date();

  if (!exists) {
    await database.insert(schema.communityMembers).values({
      id: randomUUID(),
      userId,
      communityId,
      role: "member",
      status: "active",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await database
      .update(schema.communityMembers)
      .set({ status: "active", updatedAt: now })
      .where(eq(schema.communityMembers.id, exists.id));
  }
}

export async function revokeMemberAccess(
  userId: string,
  communityId: string,
  database: DatabaseExecutor = db
) {
  await database
    .delete(schema.communityMembers)
    .where(
      and(
        eq(schema.communityMembers.userId, userId),
        eq(schema.communityMembers.communityId, communityId)
      )
    );
}

// SUBSCRIPTION MANAGEMENT

export async function cancelCommunitySubscription(subscriptionId: string) {
  const sub = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.id, subscriptionId))
    .limit(1)
    .then((r) => r[0]);

  if (!sub) return false;

  if (sub.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
  }

  await db
    .update(schema.subscriptions)
    .set({ status: "canceled" })
    .where(eq(schema.subscriptions.id, subscriptionId));

  if (sub.userId && sub.communityId) {
    await revokeMemberAccess(sub.userId, sub.communityId);
  }

  return true;
}

export async function getCommunitySubscriptionStatus(userId: string, communityId: string) {
  const result = await db
    .select()
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.communityId, communityId)
      )
    )
    .limit(1)
    .then((r) => r[0]);

  return result || null;
}

// WEBHOOK HANDLER

async function processWebhook(event: Stripe.Event, database: DatabaseExecutor) {
  const db = database;
  console.log("Webhook received:", event.type);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId as string;
      const type = session.metadata?.type as string | undefined;
      const communityId = session.metadata?.communityId as string | undefined;
      const courseId = session.metadata?.courseId as string | undefined;

      console.log("Extracted from metadata:", { userId, type, communityId, courseId });

      if (session.mode === "subscription" && session.subscription && userId) {
        if (type === "platform_subscription") {
          console.log("Activating PLATFORM subscription for user:", userId);
          await activatePlatformSubscription(userId, session.subscription as string, database);
        } else if (type === "community_subscription" && communityId) {
          console.log("Activating COMMUNITY subscription for user:", userId, communityId);
          await activateCommunitySubscription(userId, communityId, session.subscription as string, database);
        } else {
          console.warn("Unknown subscription type or missing metadata:", { type, communityId });
        }
      } else if (
        session.mode === "payment" &&
        session.payment_status === "paid" &&
        type === "course_purchase" &&
        userId &&
        courseId
      ) {
        const course = await db
          .select({ communityId: schema.courses.communityId })
          .from(schema.courses)
          .where(eq(schema.courses.id, courseId))
          .limit(1)
          .then((rows) => rows[0]);

        if (!course) {
          console.warn("Paid course no longer exists:", courseId);
          break;
        }

        await grantPaidCourseEnrollment(userId, courseId);
        await db.insert(schema.payments).values({
          id: randomUUID(),
          userId,
          communityId: course.communityId,
          courseId,
          amount: session.amount_total || 0,
          platformFee: 0,
          creatorAmount: session.amount_total || 0,
          currency: session.currency || "usd",
          status: "succeeded",
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
          paidAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log("Granted paid course enrollment:", { userId, courseId });
      } else {
        console.warn("Missing data:", {
          mode: session.mode,
          hasSubscription: !!session.subscription,
          hasUserId: !!userId,
        });
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice & {
        payment_intent: string | null;
        parent?: {
          type: "quote_details" | "subscription_details";
          subscription_details?: { subscription: string | null };
        };
      };

      const subscriptionId =
        invoice.parent?.type === "subscription_details"
          ? invoice.parent.subscription_details?.subscription ?? null
          : null;

      console.log("Invoice payment succeeded:", {
        id: invoice.id,
        subscription: subscriptionId,
        amount: invoice.amount_paid,
      });

      try {
        if (!subscriptionId) {
          console.warn("No subscription on invoice.parent — skipping payment record:", invoice.id);
          break;
        }

        // Wait for subscription to be created - retry up to 5 times
        let subRow = null;
        let retries = 5;
        
        while (retries > 0) {
          subRow = await db
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.stripeSubscriptionId, subscriptionId))
            .limit(1)
            .then((r) => r[0]);
          
          if (subRow) break;
          
          console.log(`Waiting for subscription ${subscriptionId} to be created... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 500));
          retries--;
        }

        if (!subRow) {
          console.warn("Subscription not found for invoice after retries:", subscriptionId);
          break;
        }

        const amount = invoice.amount_paid || 0;
        const platformFee = Math.round(amount * 0.029) + 30;
        const creatorAmount = Math.max(0, amount - platformFee);

        await db.insert(schema.payments).values({
          id: randomUUID(),
          subscriptionId: subRow.id,
          userId: subRow.userId,
          communityId: subRow.communityId,
          stripePaymentIntentId: invoice.payment_intent || null,
          amount,
          platformFee,
          creatorAmount,
          currency: invoice.currency || "usd",
          status: "succeeded",
          paidAt: new Date(invoice.created * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log("Payment record created for subscription:", subRow.id);

        // Grant member access if not already granted
        if (subRow.communityId && subRow.userId) {
          try {
            await grantMemberAccess(subRow.userId, subRow.communityId, database);
          } catch (err) {
            console.error("Failed granting member access after payment:", err);
            throw err;
          }
        }
      } catch (err) {
        console.error("Failed processing invoice.payment_succeeded:", err);
        throw err;
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice & {
        parent?: {
          type: "quote_details" | "subscription_details";
          subscription_details?: { subscription: string | null };
        };
      };

      const subscriptionId =
        invoice.parent?.type === "subscription_details"
          ? invoice.parent.subscription_details?.subscription ?? null
          : null;

      try {
        if (subscriptionId) {
          await db
            .update(schema.subscriptions)
            .set({ status: "past_due" })
            .where(eq(schema.subscriptions.stripeSubscriptionId, subscriptionId));

          const subRow = await db
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.stripeSubscriptionId, subscriptionId))
            .limit(1)
            .then((r) => r[0]);

          if (subRow && subRow.userId && subRow.communityId) {
            try {
              await revokeMemberAccess(subRow.userId, subRow.communityId, database);
            } catch (err) {
              console.error("Failed revoking member access after payment_failed:", err);
              throw err;
            }
          }
        }
      } catch (err) {
        console.error("Failed processing invoice.payment_failed:", err);
        throw err;
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      try {
        const stripeId = subscription.id;
        if (stripeId) {
          await db
            .update(schema.subscriptions)
            .set({ status: "canceled" })
            .where(eq(schema.subscriptions.stripeSubscriptionId, stripeId));

          const subRow = await db
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.stripeSubscriptionId, stripeId))
            .limit(1)
            .then((r) => r[0]);

          if (subRow && subRow.userId && subRow.communityId) {
            try {
              await revokeMemberAccess(subRow.userId, subRow.communityId, database);
            } catch (err) {
              console.error("Failed revoking member access after subscription.deleted:", err);
              throw err;
            }
          }
        }
      } catch (err) {
        console.error("Failed processing subscription.deleted:", err);
        throw err;
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      try {
        const stripeId = subscription.id;
        if (stripeId) {
          await db
            .update(schema.subscriptions)
            .set({ status: subscription.status })
            .where(eq(schema.subscriptions.stripeSubscriptionId, stripeId));
        }
      } catch (err) {
        console.error("Failed syncing subscription update:", err);
        throw err;
      }
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      console.log("Account updated:", account.id, "charges_enabled:", account.charges_enabled);
      
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.stripeAccountId, account.id))
        .limit(1)
        .then((r) => r[0]);
      
      if (user) {
        await db
          .update(schema.users)
          .set({
            stripeAccountStatus: account.charges_enabled ? "active" : "pending",
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, user.id));
        console.log("Updated Stripe account status for user:", user.email, "to:", account.charges_enabled ? "active" : "pending");
      }
      break;
    }

    default: {
      console.log("Unhandled event type:", event.type);
      break;
    }
  }
}

export async function handleWebhook(event: Stripe.Event): Promise<void> {
  await db.transaction(async (transaction) => {
    const existing = await transaction
      .select({ id: schema.webhookEvents.id })
      .from(schema.webhookEvents)
      .where(eq(schema.webhookEvents.stripeEventId, event.id))
      .limit(1)
      .then((rows) => rows[0]);

    if (existing) return;

    await transaction.insert(schema.webhookEvents).values({
      id: randomUUID(),
      stripeEventId: event.id,
      type: event.type,
      processedAt: new Date(),
      createdAt: new Date(),
    });

    await processWebhook(event, transaction as unknown as DatabaseExecutor);
  });
}

// REVENUE ENDPOINTS

export async function getCreatorRevenue(creatorId: string) {
  const ownedCommunities = await db
    .select({ id: schema.communities.id })
    .from(schema.communities)
    .where(eq(schema.communities.ownerId, creatorId));

  const communityIds = ownedCommunities.map((c) => c.id);

  if (communityIds.length === 0) {
    return {
      totalRevenue: 0,
      platformFeeTotal: 0,
      netRevenue: 0,
      pendingPayouts: 0,
      paidPayouts: 0,
      subscriptionsCount: 0,
      activeSubscriptionsCount: 0,
      monthlyRecurringRevenue: 0,
    };
  }

  const allSubscriptions = await db
    .select()
    .from(schema.subscriptions)
    .where(inArray(schema.subscriptions.communityId, communityIds));

  const activeSubscriptions = allSubscriptions.filter((s: any) => s.status === "active");
  const activeCount = activeSubscriptions.length;

  const mrr = activeSubscriptions.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

  const subscriptionIds = allSubscriptions.map((s: any) => s.id);
  const payments =
    subscriptionIds.length > 0
      ? await db.select().from(schema.payments).where(inArray(schema.payments.subscriptionId, subscriptionIds))
      : [];

  const totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const platformFeeTotal = payments.reduce((sum: number, p: any) => sum + (p.platformFee || 0), 0);
  const netRevenue = totalRevenue - platformFeeTotal;

  const pendingPayouts = payments
    .filter((p: any) => p.status === "succeeded" && !p.payoutId)
    .reduce((sum: number, p: any) => sum + (p.creatorAmount || 0), 0);

  const paidPayouts = payments
    .filter((p: any) => p.payoutId)
    .reduce((sum: number, p: any) => sum + (p.creatorAmount || 0), 0);

  return {
    totalRevenue,
    platformFeeTotal,
    netRevenue,
    pendingPayouts,
    paidPayouts,
    subscriptionsCount: allSubscriptions.length,
    activeSubscriptionsCount: activeCount,
    monthlyRecurringRevenue: mrr,
  };
}

export async function getTransactionHistory(
  userId: string,
  limit = 20,
  cursor?: string | null
) {
  const ownedCommunities = await db
    .select({ id: schema.communities.id })
    .from(schema.communities)
    .where(eq(schema.communities.ownerId, userId));

  const communityIds = ownedCommunities.map((c) => c.id);

  if (communityIds.length === 0) {
    return { items: [], nextCursor: null };
  }

  const conditions = [inArray(schema.payments.communityId, communityIds)];
  if (cursor) {
    const cursorTime = new Date(Number(cursor));
    if (Number.isNaN(cursorTime.getTime())) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid transaction cursor" });
    }
    conditions.push(lt(schema.payments.paidAt, cursorTime));
  }

  const rows = await db
    .select()
    .from(schema.payments)
    .where(and(...conditions))
    .orderBy(desc(schema.payments.paidAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];
  const nextCursor =
    hasMore && lastItem?.paidAt
      ? String(new Date(lastItem.paidAt).getTime())
      : null;

  const subIds = [
    ...new Set(items.map((p) => p.subscriptionId).filter(Boolean)),
  ] as string[];

  const subs =
    subIds.length > 0
      ? await db
          .select()
          .from(schema.subscriptions)
          .where(inArray(schema.subscriptions.id, subIds))
      : [];

  const communitiesRows = await db
    .select()
    .from(schema.communities)
    .where(inArray(schema.communities.id, communityIds));

  const communityMap = new Map(communitiesRows.map((c: any) => [c.id, c]));
  const subMap = new Map(subs.map((s: any) => [s.id, s]));

  return {
    items: items.map((p: any) => {
      const sub = p.subscriptionId ? subMap.get(p.subscriptionId) : undefined;
      const community = p.communityId ? communityMap.get(p.communityId) : undefined;
      return {
        id: p.id,
        amount: p.amount,
        platformFee: p.platformFee || 0,
        creatorAmount: p.creatorAmount || 0,
        currency: p.currency,
        status: p.status,
        paidAt: p.paidAt,
        subscription: {
          id: p.subscriptionId || "",
          status: sub?.status || "active",
          community: {
            id: community?.id || "",
            name: community?.name || "",
            slug: community?.slug || "",
          },
        },
      };
    }),
    nextCursor,
  };
}

export async function getPlatformRevenue() {
  const platformSubs = await db
    .select()
    .from(schema.platformSubscriptions)
    .where(eq(schema.platformSubscriptions.status, "active"));

  const totalPlatformSubs = platformSubs.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

  const allPayments = await db.select().from(schema.payments);

  const totalTransactionFees = allPayments.reduce((sum: number, p: any) => sum + (p.platformFee || 0), 0);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const monthlyTransactionFees = allPayments
    .filter((p: any) => p.paidAt && p.paidAt > thirtyDaysAgo)
    .reduce((sum: number, p: any) => sum + (p.platformFee || 0), 0);

  const monthlyPlatformSubs = platformSubs
    .filter((s: any) => s.startsAt && s.startsAt > thirtyDaysAgo)
    .reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

  return {
    totalPlatformSubscriptions: totalPlatformSubs,
    totalTransactionFees,
    totalRevenue: totalPlatformSubs + totalTransactionFees,
    monthlyPlatformSubscriptions: monthlyPlatformSubs,
    monthlyTransactionFees,
    monthlyRevenue: monthlyPlatformSubs + monthlyTransactionFees,
  };
}