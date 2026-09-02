// src/server/modules/payment/payment.router.ts
import { router, activeUserProcedure, adminProcedure } from "@/server/trpc/trpc";
import { z } from "zod";
import * as paymentService from "./payment.service";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-06-24.dahlia",
});

export const paymentRouter = router({
  course: router({
    checkout: activeUserProcedure
      .input(z.object({ courseId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => paymentService.createCourseCheckout(ctx.session.user.id, input.courseId)),
  }),
  creator: router({
    onboarding: activeUserProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      return paymentService.createConnectOnboarding(userId);
    }),
    status: activeUserProcedure.query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Get user and subscription
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then((r) => r[0]);
      
      const subscription = await paymentService.getPlatformSubscriptionStatus(userId);
      
      let accountStatus = user?.stripeAccountStatus || "pending";
      let isConnected = !!user?.stripeAccountId;
      
      // Check Stripe account status if exists
      if (user?.stripeAccountId) {
        try {
          const account = await stripe.accounts.retrieve(user.stripeAccountId);
          const chargesEnabled = account.charges_enabled;
          
          if (chargesEnabled && accountStatus !== "active") {
            // Update status in database
            await db
              .update(users)
              .set({ 
                stripeAccountStatus: "active",
                updatedAt: new Date(),
              })
              .where(eq(users.id, userId));
            accountStatus = "active";
          } else if (!chargesEnabled && accountStatus === "active") {
            accountStatus = "pending";
          }
        } catch (error) {
          console.error("Failed to check Stripe account status:", error);
        }
      }
      
      return {
        status: accountStatus,
        platformSubscription: subscription || null,
        isConnected: isConnected,
      };
    }),
    revenue: activeUserProcedure.query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      return paymentService.getCreatorRevenue(userId);
    }),
    transactions: activeUserProcedure
      .input(
        z.object({
          limit: z.number().optional().default(20),
          cursor: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        return paymentService.getTransactionHistory(userId, input.limit, input.cursor);
      }),
  }),
  admin: router({
    revenue: adminProcedure.query(async () => {
      return paymentService.getPlatformRevenue();
    }),
  }),
});