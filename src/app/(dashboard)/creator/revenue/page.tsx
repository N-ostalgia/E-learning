// src/app/(dashboard)/creator/revenue/page.tsx
"use client";

import { trpc } from "@/lib/trpc/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDollarSign,
  faUsers,
  faChartLine,
  faWallet,
  faClock,
  faCircleCheck,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

function formatCurrency(amountCents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    // Fallback if currency code is somehow invalid
    return `$${(amountCents / 100).toFixed(2)}`;
  }
}

export default function RevenuePage() {
  const {
    data: revenue,
    isLoading: revenueLoading,
    error: revenueError,
  } = trpc.payment.creator.revenue.useQuery();

  const {
    data,
    isLoading: transactionsLoading,
    error: transactionsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.payment.creator.transactions.useInfiniteQuery(
    { limit: 20 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined }
  );

  const transactions = data?.pages.flatMap((page) => page.items) ?? [];

  if (revenueLoading || transactionsLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="h-8 w-40 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--color-border)]" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-[var(--color-border)]" />
      </div>
    );
  }

  if (revenueError || transactionsError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 h-4 w-4 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-400">Couldn't load your revenue data</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {revenueError?.message || transactionsError?.message || "Please try refreshing the page."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "MRR",
      value: `$${((revenue?.monthlyRecurringRevenue || 0) / 100).toFixed(2)}`,
      icon: faChartLine,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Active Subscribers",
      value: revenue?.activeSubscriptionsCount || 0,
      icon: faUsers,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Total Revenue",
      value: `$${((revenue?.totalRevenue || 0) / 100).toFixed(2)}`,
      icon: faDollarSign,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Platform Fees",
      value: `$${((revenue?.platformFeeTotal || 0) / 100).toFixed(2)}`,
      icon: faWallet,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Pending Payout",
      value: `$${((revenue?.pendingPayouts || 0) / 100).toFixed(2)}`,
      icon: faClock,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      label: "Paid Out",
      value: `$${((revenue?.paidPayouts || 0) / 100).toFixed(2)}`,
      icon: faCircleCheck,
      color: "text-teal-400",
      bg: "bg-teal-500/10",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">Revenue</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Your earnings and subscriber metrics</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2">
              <div className={`rounded-lg ${stat.bg} p-2`}>
                <FontAwesomeIcon icon={stat.icon} className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="mt-2 font-display text-xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="font-semibold text-[var(--color-text-primary)]">Recent Transactions</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Community</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Platform Fee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                    No transactions yet
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {t.paidAt ? new Date(t.paidAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-primary)]">
                      {t.subscription.community.name || "-"}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                      {formatCurrency(t.amount || 0, t.currency)}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {formatCurrency(t.platformFee || 0, t.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {hasNextPage && (
            <div className="border-t border-[var(--color-border)] p-3 text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)] disabled:opacity-60"
              >
                {isFetchingNextPage ? (
                  <span className="mx-auto block h-4 w-20 animate-pulse rounded bg-[var(--color-border)]" aria-label="Loading more transactions" />
                ) : (
                  "Load more"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}