// src/app/(dashboard)/community/[slug]/courses/create/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faUpload } from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import { FileUploader } from "@/components/features/upload/FileUploader";

export default function CreateCoursePage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const utils = trpc.useUtils();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [isPublished, setIsPublished] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: community } = trpc.community.getBySlug.useQuery({ slug });

  const createMutation = trpc.course.create.useMutation({
    onSuccess: (course) => {
      utils.course.list.invalidate({ communityId: community?.id || "" });
      toast.success("Course created successfully!");
      router.push(`/community/${slug}/courses/${course.id}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!community) {
      toast.error("Community not found");
      return;
    }

    createMutation.mutate({
      communityId: community.id,
      title,
      description: description || undefined,
      price: price * 100, // Convert to cents
      imageUrl: imageUrl || undefined,
      imageKey: imageKey || undefined,
      isPublished,
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href={`/community/${slug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
        Back to Community
      </Link>

      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        Create Course
      </h1>
      <p className="mt-1 text-[var(--color-text-secondary)]">
        Create a new course for your community members
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Course Image */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Course Image
          </label>
          <FileUploader
            uploadType="image"
            accept="image/*"
            maxSize={5}
            onUploadSuccess={(url, key) => {
              setImageUrl(url);
              setImageKey(key);
              toast.success("Image uploaded successfully!");
            }}
            onUploadError={(error) => {
              toast.error(error);
            }}
            buttonText="Upload Image"
          />
          {imageUrl && (
            <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
              <img
                src={imageUrl}
                alt="Course thumbnail"
                className="max-h-32 rounded object-cover"
              />
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="title"
            className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Course Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={200}
            placeholder="e.g. Introduction to Web Development"
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
            rows={4}
            placeholder="What will students learn in this course?"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label
            htmlFor="price"
            className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Price (USD)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-text-secondary)]">
              $
            </span>
            <input
              id="price"
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-8 pr-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Set to 0 for free courses
          </p>
        </div>

        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
            />
            <span className="text-sm text-[var(--color-text-primary)]">
              Publish immediately
            </span>
          </label>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Unpublished courses are only visible to you (community owner)
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {createMutation.isPending ? "Creating..." : "Create Course"}
        </button>
      </form>
    </div>
  );
}