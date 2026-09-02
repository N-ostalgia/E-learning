// src/app/(dashboard)/create-community/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faLock, faDollarSign, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "", label: "Select a category..." },
  { value: "tech", label: "Tech" },
  { value: "design", label: "Design" },
  { value: "business", label: "Business" },
  { value: "science", label: "Science" },
  { value: "arts", label: "Arts" },
  { value: "music", label: "Music" },
  { value: "gaming", label: "Gaming" },
  { value: "sports", label: "Sports" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

export default function CreateCommunityPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: sessionData, refetch: refetchSession } = useSession();
  
  const { data: subscriptionStatus, refetch: refetchSubscription } = trpc.payment.creator.status.useQuery(undefined, {
    enabled: !!sessionData?.user?.id,
  });
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [price, setPrice] = useState<number | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isProSubscribed = subscriptionStatus?.platformSubscription?.status === "active";

  useEffect(() => {
    if (sessionData?.user?.id) {
      refetchSession();
      refetchSubscription();
    }
  }, [sessionData?.user?.id, refetchSession, refetchSubscription]);

  const createMutation = trpc.community.create.useMutation({
    onSuccess: (community) => {
      utils.community.list.invalidate();
      utils.community.myCommunities.invalidate();
      toast.success("Community created successfully!");
      router.push(`/community/${community.slug}`);
    },
    onError: (err) => {
      // Check if error is due to Stripe onboarding
      if (err.message.includes("STRIPE_ONBOARDING_REQUIRED:")) {
        const url = err.message.replace("STRIPE_ONBOARDING_REQUIRED:", "");
        setIsRedirecting(true);
        toast.info("Redirecting to Stripe to connect your account...");
        // Redirect to Stripe onboarding
        window.location.href = url;
        return;
      }
      
      if (err.data?.code === "PAYMENT_REQUIRED") {
        setError("You need an active Nexus Pro subscription to create a community.");
      } else {
        setError(err.message);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate({
      name,
      description,
      category: category || null,
      isPublic,
      price: isPaid ? price : null,
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/discover"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
        Back to Discover
      </Link>

      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        Create a Community
      </h1>
      <p className="mt-1 text-[var(--color-text-secondary)]">
        Build a space for people to learn together.
      </p>

      {isRedirecting && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin text-emerald-500" />
          <p className="text-sm text-[var(--color-text-primary)]">
            Redirecting to Stripe to complete your account setup...
          </p>
        </div>
      )}

      {!isProSubscribed && sessionData?.user?.id && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <FontAwesomeIcon icon={faLock} className="mt-0.5 h-4 w-4 text-amber-500" />
          <div>
            <p className="text-sm text-[var(--color-text-primary)]">
              Nexus Pro subscription required
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              You need an active Pro subscription to create communities.{" "}
              <Link href="/creator/onboarding" className="text-emerald-500 hover:underline">
                Subscribe now
              </Link>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Community Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            placeholder="e.g. UX Design Circle"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="What is this community about?"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
          />
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {description.length}/500
          </p>
        </div>

        <div>
          <label
            htmlFor="category"
            className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Visibility
          </label>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="accent-[var(--color-accent)]"
              />
              <span className="text-sm text-[var(--color-text-primary)]">Public</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="accent-[var(--color-accent)]"
              />
              <span className="text-sm text-[var(--color-text-primary)]">Private</span>
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Pricing
          </label>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={!isPaid}
                onChange={() => {
                  setIsPaid(false);
                  setPrice(null);
                }}
                className="accent-[var(--color-accent)]"
              />
              <span className="text-sm text-[var(--color-text-primary)]">Free</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={isPaid}
                onChange={() => setIsPaid(true)}
                className="accent-[var(--color-accent)]"
              />
              <span className="text-sm text-[var(--color-text-primary)]">Paid</span>
            </label>
          </div>

          {isPaid && (
            <div className="mt-3">
              <label
                htmlFor="price"
                className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Price (USD)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <FontAwesomeIcon icon={faDollarSign} className="h-4 w-4 text-[var(--color-text-secondary)]" />
                </div>
                <input
                  id="price"
                  type="number"
                  min={1}
                  step={1}
                  value={price || ""}
                  onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : null)}
                  required={isPaid}
                  placeholder="e.g. 10"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-8 pr-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                />
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Set a monthly subscription price for members to join your community.
              </p>
              {!isRedirecting && (
                <p className="mt-1 text-xs text-amber-500">
                  Note: You'll need to connect your Stripe account to receive payments.
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">{error}</p>
            {error.includes("Nexus Pro subscription") && (
              <Link
                href="/creator/onboarding"
                className="mt-2 inline-block text-sm font-medium text-emerald-500 hover:underline"
              >
                Subscribe to Nexus Pro →
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={createMutation.isPending || isRedirecting}
          className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {createMutation.isPending ? "Creating..." : 
           isRedirecting ? "Redirecting to Stripe..." : 
           "Create Community"}
        </button>
      </form>
    </div>
  );
}