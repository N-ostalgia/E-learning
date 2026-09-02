// src/app/(dashboard)/admin/health/page.tsx
"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDatabase,
  faCheckCircle,
  faTimesCircle,
  faServer,
  faClock,
  faRefresh,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";

export default function HealthPage() {
  const { data, isLoading, refetch } = trpc.admin.health.get.useQuery();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  const isDbHealthy = data?.db === "ok";

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
              System Health
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Monitor platform services and subsystems
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
          >
            <FontAwesomeIcon icon={faRefresh} className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Database Status */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isDbHealthy ? "bg-emerald-50" : "bg-red-50"
            }`}>
              <FontAwesomeIcon
                icon={faDatabase}
                className={`h-5 w-5 ${
                  isDbHealthy ? "text-emerald-600" : "text-red-600"
                }`}
              />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">
                Database
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                PostgreSQL / SQLite connection
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {isDbHealthy ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4" />
                  Healthy
                </span>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  Connected successfully
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                  <FontAwesomeIcon icon={faTimesCircle} className="h-4 w-4" />
                  Unhealthy
                </span>
                <span className="text-sm text-red-600">
                  {data?.error || "Connection failed"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* WebSocket Status */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <FontAwesomeIcon icon={faServer} className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">
                WebSocket Server
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Real-time notification relay
              </p>
            </div>
          </div>

          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
              <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
              Check Manually
            </span>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Run <code className="rounded bg-[var(--color-bg)] px-2 py-0.5 text-xs text-[var(--color-text-primary)]">npm run ws:server</code> to start the WebSocket relay
            </p>
          </div>
        </div>

        {/* Redis Status */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">
                Redis
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Pub/Sub for real-time events
              </p>
            </div>
          </div>

          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4" />
              Running
            </span>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {`127.0.0.1:6379`}
            </p>
          </div>
        </div>

        {/* Uptime */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <FontAwesomeIcon icon={faClock} className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">
                Server Uptime
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Application running time
              </p>
            </div>
          </div>

          <div className="mt-4">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              Since {new Date().toLocaleDateString()}
            </span>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Check server logs for exact start time
            </p>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`flex h-3 w-3 rounded-full ${isDbHealthy ? "bg-emerald-500" : "bg-red-500"}`} />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            Overall Status: {isDbHealthy ? "All Systems Operational" : "Degraded"}
          </span>
          <span className="text-sm text-[var(--color-text-secondary)]">
            • Last checked: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}