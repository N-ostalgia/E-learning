// src/app/(dashboard)/admin/page.tsx
"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faBuilding,
  faPenFancy,
  faComments,
  faFlag,
  faArrowRight,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";

export default function AdminDashboardPage() {
  const { data: stats } = trpc.admin.stats.get.useQuery();

  const statCards = [
    {
      label: "Users",
      value: stats?.totalUsers ?? 0,
      icon: faUsers,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Communities",
      value: stats?.totalCommunities ?? 0,
      icon: faBuilding,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "Posts",
      value: stats?.totalPosts ?? 0,
      icon: faPenFancy,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Comments",
      value: stats?.totalComments ?? 0,
      icon: faComments,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Reports",
      value: stats?.totalReports ?? 0,
      icon: faFlag,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      badge: stats?.pendingReports ?? 0,
    },
  ];

  const pendingReports = stats?.pendingReports ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
          Admin Dashboard
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Overview of platform activity and moderation
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}
              >
                <FontAwesomeIcon
                  icon={stat.icon}
                  className={`h-5 w-5 ${stat.iconColor}`}
                />
              </div>
              {stat.badge !== undefined && stat.badge > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-medium text-white">
                  {stat.badge} pending
                </span>
              )}
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-[var(--color-text-primary)]">
              {stat.value.toLocaleString()}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <h3 className="font-semibold text-[var(--color-text-primary)]">
          Quick actions
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Common administrative tasks
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {/* Reports link is the one place pending state is called out — no duplicate badge elsewhere */}
          <Link
            href="/admin/reports"
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              pendingReports > 0
                ? "bg-red-500 text-white hover:bg-red-600"
                : "border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
            }`}
          >
            <FontAwesomeIcon icon={faFlag} className="h-3.5 w-3.5" />
            {pendingReports > 0
              ? `Review ${pendingReports} pending report${pendingReports === 1 ? "" : "s"}`
              : "Moderation"}
            {pendingReports > 0 && (
              <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
            )}
          </Link>

          <Link
            href="/admin/users"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
          >
            <FontAwesomeIcon icon={faUsers} className="mr-2 h-3.5 w-3.5" />
            Manage users
          </Link>
          <Link
            href="/admin/communities"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
          >
            <FontAwesomeIcon icon={faBuilding} className="mr-2 h-3.5 w-3.5" />
            Communities
          </Link>
        </div>

        {pendingReports === 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
            <FontAwesomeIcon
              icon={faCheckCircle}
              className="h-5 w-5 text-emerald-500"
            />
            <p className="text-sm text-emerald-700">
              No pending reports — moderation queue is clear.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}