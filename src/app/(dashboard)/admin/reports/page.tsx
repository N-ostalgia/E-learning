// src/app/(dashboard)/admin/reports/page.tsx
"use client";

import { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
  faTrash,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

type ReportStatus = "pending" | "reviewed" | "dismissed";

const STATUS_BADGES: Record<ReportStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  reviewed: {
    label: "Reviewed",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  dismissed: {
    label: "Dismissed",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

export default function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const utils = trpc.useUtils();

  // ✅ Fetch ALL reports (unfiltered) for counting
  const { data: allData, isLoading, refetch } = trpc.admin.reports.list.useQuery({ status: undefined, limit: 100 });

  // Infinite query for displayed reports (supports pagination)
  const reportsQuery = trpc.admin.reports.list.useInfiniteQuery(
    { status: statusFilter === "all" ? undefined : statusFilter, limit: 20 },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    }
  );

  const displayedReports = reportsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  const updateReport = trpc.admin.reports.update.useMutation({
    onSuccess: () => {
      utils.admin.reports.list.invalidate();
      reportsQuery.refetch();
      refetch();
      toast.success("Report updated successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update report");
    },
  });

  const deleteContent = trpc.admin.content.delete.useMutation({
    onSuccess: () => {
      utils.admin.reports.list.invalidate();
      reportsQuery.refetch();
      refetch();
      toast.success("Content deleted successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete content");
    },
  });

  const handleStatusUpdate = (reportId: string, status: ReportStatus) => {
    updateReport.mutate({ reportId, status });
  };

  const handleDeleteContent = (targetType: "post" | "comment", targetId: string) => {
    if (confirm("Are you sure you want to delete this content? This action cannot be undone.")) {
      deleteContent.mutate({ targetType, targetId });
    }
  };

  // ✅ All reports (unfiltered)
  const allReports = allData?.items ?? [];

  // ✅ Compute counts from the FULL list
  const counts = useMemo(() => {
    const pending = allReports.filter((r) => r.status === "pending").length;
    const reviewed = allReports.filter((r) => r.status === "reviewed").length;
    const dismissed = allReports.filter((r) => r.status === "dismissed").length;
    return { pending, reviewed, dismissed, total: allReports.length };
  }, [allReports]);


  const pendingCount = counts.pending;

  if (isLoading && !reportsQuery.isFetching) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
              Reports
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Review and moderate reported content
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white">
              <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Filters - Counts from FULL list */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-[var(--color-accent)] text-white"
              : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          }`}
        >
          All ({counts.total})
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "pending"
              ? "bg-[var(--color-accent)] text-white"
              : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          }`}
        >
          Pending ({counts.pending})
        </button>
        <button
          onClick={() => setStatusFilter("reviewed")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "reviewed"
              ? "bg-[var(--color-accent)] text-white"
              : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          }`}
        >
          Reviewed ({counts.reviewed})
        </button>
        <button
          onClick={() => setStatusFilter("dismissed")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === "dismissed"
              ? "bg-[var(--color-accent)] text-white"
              : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          }`}
        >
          Dismissed ({counts.dismissed})
        </button>
      </div>

      {/* Reports List */}
      {displayedReports.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <FontAwesomeIcon
            icon={faCheckCircle}
            className="mx-auto h-12 w-12 text-emerald-500"
          />
          <h3 className="mt-4 font-display text-lg font-semibold text-[var(--color-text-primary)]">
            No reports found
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {statusFilter === "all"
              ? "There are no reports to review."
              : `No ${statusFilter} reports found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedReports.map((report) => {
            const badge = STATUS_BADGES[report.status as ReportStatus] ?? STATUS_BADGES.pending;
            const isPending = report.status === "pending";

            return (
              <div
                key={report.id}
                className={`rounded-lg border ${
                  isPending
                    ? "border-amber-200 bg-amber-50/30"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]"
                } p-4 shadow-sm transition-shadow hover:shadow-md`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {report.status === "pending" && (
                          <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
                        )}
                        {badge.label}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        @{report.reporter.username}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        • {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        • {report.targetType}
                      </span>
                    </div>

                    <div className="mb-1.5 rounded-md bg-[var(--color-bg)] px-3 py-1.5">
                      <p className="text-sm text-[var(--color-text-primary)] line-clamp-2">
                        {report.target.content || "[No content]"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                      <span>
                        Reason: <span className="text-[var(--color-text-primary)] capitalize">{report.reason}</span>
                      </span>
                      <span>•</span>
                      <span>Author: @{report.target.author.username}</span>
                      {report.target.community && (
                        <>
                          <span>•</span>
                          <span>in {report.target.community.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(report.id, "reviewed")}
                          className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(report.id, "dismissed")}
                          className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)]"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    {report.status !== "pending" && (
                      <button
                        onClick={() => handleStatusUpdate(report.id, "pending")}
                        className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)]"
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteContent(report.targetType, report.targetId)}
                      className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                      title="Delete content"
                    >
                      <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reportsQuery.hasNextPage && (
        <div className="mt-4 text-center">
          <button
            onClick={() => reportsQuery.fetchNextPage()}
            disabled={reportsQuery.isFetchingNextPage}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] disabled:opacity-50"
          >
            {reportsQuery.isFetchingNextPage ? "Loading..." : "Load more reports"}
          </button>
        </div>
      )}
    </div>
  );
}