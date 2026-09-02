// src/app/(dashboard)/creator/connect/page.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faArrowRight } from "@fortawesome/free-solid-svg-icons";

export default function ConnectPage() {
  const [loading, setLoading] = useState(false);

  const { data: accountStatus } = trpc.payment.creator.status.useQuery();
  const createAccountLink = trpc.payment.creator.onboarding.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create onboarding link");
    },
  });

  const handleConnect = () => {
    setLoading(true);
    createAccountLink.mutate();
  };

  if (accountStatus?.status === "active") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <FontAwesomeIcon icon={faCheckCircle} className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">
            Stripe Connected
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Your Stripe account is active and ready to receive payments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
        Connect Stripe
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Connect your Stripe account to receive payments from your community members.
      </p>

      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-500">
              1
            </div>
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">
                Subscribe to Nexus Pro
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                You need an active Pro subscription to connect Stripe.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-500">
              2
            </div>
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">
                Connect Stripe Account
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Create or link your existing Stripe Express account.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#635bff] px-4 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <span className="h-4 w-32 animate-pulse rounded bg-white/50" aria-label="Creating Stripe link" />
          ) : (
            "Connect with Stripe"
          )}
          <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}