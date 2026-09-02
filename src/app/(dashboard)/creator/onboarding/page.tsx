// src/app/(dashboard)/creator/onboarding/page.tsx
"use client";
import React from "react";
import SubscribeButton from "@/components/features/payment/SubscribeButton";
import { useSession } from "@/lib/auth-client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faUsers, 
  faVideo, 
  faHeadset, 
  faChartLine, 
  faPalette,
  faCheckCircle,
  faRocket,
  faInfinity
} from "@fortawesome/free-solid-svg-icons";

export default function CreatorOnboardingPage() {
  const { data: sessionData } = useSession();
  const userId = sessionData?.user?.id;
  
  const features = [
    {
      icon: faUsers,
      title: "Unlimited Members",
      description: "Grow your community without limits"
    },
    {
      icon: faVideo,
      title: "Unlimited Courses",
      description: "Upload as many courses as you want"
    },
    {
      icon: faHeadset,
      title: "Priority Support",
      description: "Get help when you need it most"
    },
    {
      icon: faChartLine,
      title: "Advanced Analytics",
      description: "Track engagement and revenue"
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[var(--color-bg)] to-[var(--color-surface)]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <FontAwesomeIcon icon={faRocket} className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="font-display text-4xl font-bold text-[var(--color-text-primary)] sm:text-5xl">
            Nexus Pro
          </h1>
          <p className="mt-3 text-lg text-[var(--color-text-secondary)]">
            Everything you need to build, grow, and monetize your community
          </p>
        </div>

        {/* Pricing Card */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          <div className="border-b border-[var(--color-border)] bg-emerald-500/5 px-6 py-4 sm:px-8">
            <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
              <div>
                <span className="text-3xl font-bold text-[var(--color-text-primary)]">$99</span>
                <span className="text-[var(--color-text-secondary)]">/month</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                <FontAwesomeIcon icon={faCheckCircle} className="h-3.5 w-3.5" />
                Best value
              </span>
            </div>
          </div>

          {/* Features Grid */}
          <div className="p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors hover:border-emerald-500/30">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <FontAwesomeIcon icon={feature.icon} className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">{feature.title}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                Includes
              </span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>

            {/* Bonus Features */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faInfinity} className="h-3.5 w-3.5 text-emerald-500" />
                Little to no transaction fees
              </span>
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheckCircle} className="h-3.5 w-3.5 text-emerald-500" />
                Cancel anytime
              </span>
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheckCircle} className="h-3.5 w-3.5 text-emerald-500" />
                Secure payment
              </span>
            </div>

            {/* Subscribe Button */}
            <div className="mt-6">
              <SubscribeButton userId={userId} />
            </div>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Join thousands of creators already building on Nexus
          </p>
        </div>
      </div>
    </div>
  );
}