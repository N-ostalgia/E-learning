// src/server/modules/payment/payment.types.ts
export type PlatformPlan = "pro" | "enterprise";

export type PlatformSubscriptionStatus = "active" | "canceled" | "expired";

export type PlatformSubscription = {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  status: PlatformSubscriptionStatus;
  plan: PlatformPlan;
  amount: number;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "incomplete";

export type PaymentWithDetails = {
  id: string;
  amount: number;
  platformFee: number;
  creatorAmount: number;
  currency: string;
  status: PaymentStatus;
  paidAt: Date;
  subscription: {
    id: string;
    status: SubscriptionStatus;
    community: {
      id: string;
      name: string;
      slug: string;
    };
  };
};

export type TransactionHistoryResult = {
  items: PaymentWithDetails[];
  nextCursor: string | null;
};

export type CreatorRevenue = {
  totalRevenue: number;
  platformFeeTotal: number;
  netRevenue: number;
  pendingPayouts: number;
  paidPayouts: number;
  subscriptionsCount: number;
  activeSubscriptionsCount: number;
  monthlyRecurringRevenue: number; // MRR
};

export type PlatformRevenue = {
  totalPlatformSubscriptions: number;
  totalTransactionFees: number;
  totalRevenue: number;
  monthlyPlatformSubscriptions: number;
  monthlyTransactionFees: number;
  monthlyRevenue: number;
};