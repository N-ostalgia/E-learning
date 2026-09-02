"use client";
import React from "react";

export default function ReportItem({ report, onUpdate, onDelete }: any) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm text-[var(--color-text-secondary)]">Reported by {report.reporter.username} • {new Date(report.createdAt).toLocaleString()}</div>
          <div className="mt-3 text-sm text-[var(--color-text-primary)] font-medium">{report.target.title ?? report.target.content}</div>
          <div className="mt-2 text-sm">Reason: {report.reason}</div>
          <div className="mt-2 text-xs text-[var(--color-text-secondary)]">Target: {report.target.type}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <select defaultValue={report.status} onChange={(e) => onUpdate(report.id, e.target.value)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm">
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <button onClick={() => onDelete(report.target.type, report.targetId)} className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white">Delete Content</button>
        </div>
      </div>
    </div>
  );
}
