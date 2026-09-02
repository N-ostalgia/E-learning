"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faSave,
  faImage,
  faTrash,
  faGlobe,
  faLock,
  faTags,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import { FileUploader } from "@/components/features/upload/FileUploader";

const CATEGORIES = [
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

export default function CommunitySettingsPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: community, isLoading } = trpc.community.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );
  const { data: platformStatus } = trpc.payment.creator.status.useQuery();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [price, setPrice] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (community) {
      setName(community.name || "");
      setDescription(community.description || "");
      setCategory(community.category || "");
      setIsPublic(community.isPublic ?? true);
      setPrice(community.price ? String((community.price / 100).toFixed(2)) : "");
      setAvatarUrl(community.avatarUrl || null);
      setCoverUrl(community.coverUrl || null);
    }
  }, [community]);

  const updateCommunity = trpc.community.update.useMutation({
    onSuccess: () => {
      toast.success("Community updated successfully!");
      utils.community.getBySlug.invalidate({ slug });
      utils.community.list.invalidate();
      utils.community.myCommunities.invalidate();
      setIsSaving(false);
      // ✅ Redirect to community page after save
      router.push(`/community/${slug}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update community");
      setIsSaving(false);
    },
  });

  const updatePrice = trpc.community.updatePrice.useMutation({
    onSuccess: () => {
      toast.success("Price updated successfully");
      utils.community.getBySlug.invalidate({ slug });
    },
    onError: (err) => toast.error(err.message || "Failed to update price"),
  });

  const deleteCommunity = trpc.community.delete.useMutation({
    onSuccess: () => {
      toast.success("Community deleted successfully");
      utils.community.list.invalidate();
      utils.community.myCommunities.invalidate();
      router.push("/discover");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete community");
    },
  });

  const handleSave = () => {
    if (!community) return;
    setIsSaving(true);
    updateCommunity.mutate({
      communityId: community.id,
      name,
      description: description || undefined,
      category: category || undefined,
      isPublic,
      avatarUrl: avatarUrl || undefined,
      avatarKey: avatarKey || undefined,
      coverUrl: coverUrl || undefined,
      coverKey: coverKey || undefined,
    });
  };

  const handlePriceSave = () => {
    if (!community) return;
    const cents = price ? Math.round(Number(price) * 100) : null;
    updatePrice.mutate({ communityId: community.id, price: cents });
  };

  const handleDelete = () => {
    if (!community) return;
    if (
      confirm(
        `Are you sure you want to delete "${community.name}"? This action cannot be undone. All posts, comments, and member data will be permanently removed.`
      )
    ) {
      deleteCommunity.mutate({ communityId: community.id });
    }
  };

  if (isLoading || !community) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-[var(--color-border)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/community/${slug}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
            Back to Community
          </Link>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
            Community Settings
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage your community details and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Basic Information */}
      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="font-semibold text-[var(--color-text-primary)]">Basic Information</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Update your community's name, description, and other basic details.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              Community Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              placeholder="Community name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              placeholder="Describe what your community is about"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              <FontAwesomeIcon icon={faTags} className="mr-2 h-4 w-4" />
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              <FontAwesomeIcon icon={isPublic ? faGlobe : faLock} className="mr-2 h-4 w-4" />
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
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {isPublic
                ? "Anyone can find and request to join this community."
                : "Only invited members can find and join this community."}
            </p>
          </div>
        </div>
      </div>

      {/* Media — redesigned: a real banner+avatar preview instead of two
          disconnected upload blocks, so owners see how it'll actually look. */}
      <div className="mt-6 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="p-6 pb-0">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Media</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            This is exactly how your cover and avatar will appear on the community page.
          </p>
        </div>

        {/* Live preview: cover banner with the avatar overlapping its edge */}
        <div className="relative mt-5">
          <div className="h-40 w-full overflow-hidden bg-[var(--color-bg)] sm:h-48">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="Community cover"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-[repeating-linear-gradient(135deg,var(--color-border)_0px,var(--color-border)_1px,transparent_1px,transparent_12px)]">
                <FontAwesomeIcon
                  icon={faImage}
                  className="h-5 w-5 text-[var(--color-text-secondary)]"
                />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  No cover image yet
                </span>
              </div>
            )}
          </div>

          <div className="absolute -bottom-10 left-6">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-[var(--color-surface)] bg-[var(--color-bg)] shadow-sm">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Community avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <FontAwesomeIcon
                    icon={faUser}
                    className="h-6 w-6 text-[var(--color-text-secondary)]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Space reserved for the avatar's overlap */}
        <div className="h-12" />

        {/* Matched upload controls — same structure for both fields */}
        <div className="grid grid-cols-1 gap-6 p-6 pt-2 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
              Avatar
            </label>
            <div className="flex items-center gap-2">
              <FileUploader
                uploadType="image"
                accept="image/*"
                maxSize={5}
                onUploadSuccess={(url, key) => {
                  setAvatarUrl(url);
                  setAvatarKey(key);
                  toast.success("Avatar uploaded successfully!");
                }}
                onUploadError={(error) => {
                  toast.error(error);
                }}
                buttonText={avatarUrl ? "Change" : "Upload"}
              />
              {avatarUrl && (
                <button
                  onClick={() => {
                    setAvatarUrl(null);
                    setAvatarKey(null);
                  }}
                  aria-label="Remove avatar"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:border-red-300 hover:text-red-500"
                >
                  <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
              Square, at least 200×200px. JPG or PNG, up to 5MB.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
              Cover image
            </label>
            <div className="flex items-center gap-2">
              <FileUploader
                uploadType="image"
                accept="image/*"
                maxSize={10}
                onUploadSuccess={(url, key) => {
                  setCoverUrl(url);
                  setCoverKey(key);
                  toast.success("Cover image uploaded successfully!");
                }}
                onUploadError={(error) => {
                  toast.error(error);
                }}
                buttonText={coverUrl ? "Change" : "Upload"}
              />
              {coverUrl && (
                <button
                  onClick={() => {
                    setCoverUrl(null);
                    setCoverKey(null);
                  }}
                  aria-label="Remove cover image"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:border-red-300 hover:text-red-500"
                >
                  <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
              Recommended 1200×300px. JPG or PNG, up to 10MB.
            </p>
          </div>
        </div>
      </div>

      {/* Monetization */}
      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="font-semibold text-[var(--color-text-primary)]">Monetization</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Set a monthly subscription price for your community.
        </p>

        {platformStatus?.status === "active" ? (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">
                Community Price (per month)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-[var(--color-text-secondary)]">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                  placeholder="19.99"
                />
                <span className="text-sm text-[var(--color-text-secondary)]">per month</span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Platform fee: 2.9% + $0.30 per transaction
              </p>
              {community.price && community.price > 0 && (
                <p className="mt-1 text-xs text-emerald-500">
                  Current price: ${(community.price / 100).toFixed(2)}/month
                </p>
              )}
            </div>
            <button
              onClick={handlePriceSave}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
            >
              Save Price
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <p className="text-sm text-amber-700">
              You need an active platform subscription to monetize your community.
            </p>
            <Link
              href="/creator/onboarding"
              className="mt-2 inline-block text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              Subscribe to Nexus Pro →
            </Link>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-6">
        <h3 className="font-semibold text-red-500">Danger Zone</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Permanently delete this community and all its data.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleteCommunity.isPending}
          className="mt-3 rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          {deleteCommunity.isPending ? "Deleting..." : "Delete Community"}
        </button>
      </div>
    </div>
  );
}