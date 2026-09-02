// src/app/(dashboard)/community/[slug]/courses/[courseId]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faSave,
  faTrash,
  faPencil,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import { FileUploader } from "@/components/features/upload/FileUploader";

export default function EditCoursePage() {
  const router = useRouter();
  const { slug, courseId } = useParams<{ slug: string; courseId: string }>();
  const utils = trpc.useUtils();

  const { data: course, isLoading } = trpc.course.get.useQuery({ courseId });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [isPublished, setIsPublished] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description || "");
      setPrice(course.price ? course.price / 100 : 0);
      setIsPublished(course.isPublished || false);
      setImageUrl(course.imageUrl);
      setImageKey(course.imageKey);
    }
  }, [course]);

  const updateMutation = trpc.course.update.useMutation({
    onSuccess: () => {
      utils.course.get.invalidate({ courseId });
      utils.course.list.invalidate({ communityId: course?.communityId || "" });
      toast.success("Course updated successfully");
      router.push(`/community/${slug}/courses/${courseId}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const deleteMutation = trpc.course.delete.useMutation({
    onSuccess: () => {
      utils.course.list.invalidate({ communityId: course?.communityId || "" });
      toast.success("Course deleted successfully");
      router.push(`/community/${slug}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    updateMutation.mutate({
      courseId,
      title,
      description: description || undefined,
      price: Math.round(price * 100),
      imageUrl: imageUrl || undefined,
      imageKey: imageKey || undefined,
      isPublished,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this course? All lessons will also be deleted.")) {
      deleteMutation.mutate({ courseId });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-[var(--color-border)]" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-sm text-red-400">Course not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <Link
          href={`/community/${slug}/courses/${courseId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
          Back to Course
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="mb-6 inline-flex items-center gap-1 text-sm text-red-400 hover:text-red-500 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
          Delete Course
        </button>
      </div>

      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        Edit Course
      </h1>
      <p className="mt-1 text-[var(--color-text-secondary)]">
        Update your course details
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
              toast.success("Image uploaded successfully");
            }}
            onUploadError={(error) => {
              toast.error(error);
            }}
            buttonText={imageUrl ? "Change Image" : "Upload Image"}
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
              <FontAwesomeIcon
                icon={isPublished ? faSave : faPencil}
                className={`mr-2 h-4 w-4 ${isPublished ? "text-emerald-500" : "text-amber-500"}`}
              />
              {isPublished ? "Published" : "Draft"}
            </span>
          </label>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {isPublished
              ? "Visible to all community members"
              : "Only visible to you (community owner)"}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}