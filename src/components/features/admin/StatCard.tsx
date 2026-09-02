"use client";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function StatCard({ icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--color-surface)] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-[var(--color-text-secondary)]">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">{value}</div>
        </div>
        <div className="text-[var(--color-text-secondary)]">
          <FontAwesomeIcon icon={icon} className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
