"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faSave,
  faVideo,
  faImage,
  faFile,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import { FileUploader } from "@/components/features/upload/FileUploader";

export default function CreateLessonPage() {
  const router = useRouter();
  const { slug, courseId } = useParams<{ slug: string; courseId: string }>();
  const utils = trpc.useUtils();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [duration, setDuration] = useState(0);
  const [isFree, setIsFree] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailKey, setThumbnailKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.course.createLesson.useMutation({
    onSuccess: () => {
      utils.course.get.invalidate({ courseId });
      toast.success("Lesson created successfully");
      router.push(`/community/${slug}/courses/${courseId}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    createMutation.mutate({
      courseId,
      title,
      description: description || undefined,
      content: content || undefined,
      duration,
      isFree,
      isPublished,
      videoUrl: videoUrl || undefined,
      videoKey: videoKey || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      thumbnailKey: thumbnailKey || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href={`/community/${slug}/courses/${courseId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
        Back to Course
      </Link>

      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        Create Lesson
      </h1>
      <p className="mt-1 text-[var(--color-text-secondary)]">
        Add a new lesson to this course
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Video Upload */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            <FontAwesomeIcon icon={faVideo} className="mr-2 h-4 w-4" />
            Lesson Video
          </label>
          <FileUploader
            uploadType="video"
            accept="video/*"
            maxSize={500}
            onUploadSuccess={(url, key) => {
              setVideoUrl(url);
              setVideoKey(key);
              toast.success("Video uploaded successfully");
            }}
            onUploadError={(error) => {
              toast.error(error);
            }}
            buttonText={videoUrl ? "Change Video" : "Upload Video"}
          />
          {videoUrl && (
            <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-sm text-emerald-400">
              Video uploaded successfully
            </div>
          )}
        </div>

        {/* Thumbnail Upload */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            <FontAwesomeIcon icon={faImage} className="mr-2 h-4 w-4" />
            Thumbnail Image
          </label>
          <FileUploader
            uploadType="image"
            accept="image/*"
            maxSize={5}
            onUploadSuccess={(url, key) => {
              setThumbnailUrl(url);
              setThumbnailKey(key);
              toast.success("Thumbnail uploaded successfully");
            }}
            onUploadError={(error) => {
              toast.error(error);
            }}
            buttonText={thumbnailUrl ? "Change Thumbnail" : "Upload Thumbnail"}
          />
          {thumbnailUrl && (
            <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
              <img
                src={thumbnailUrl}
                alt="Thumbnail"
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
            Lesson Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={200}
            placeholder="e.g. Introduction to HTML"
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
            rows={3}
            placeholder="What will students learn in this lesson?"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label
            htmlFor="content"
            className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Lesson Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Write the lesson content here..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label
            htmlFor="duration"
            className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Duration (minutes)
          </label>
          <input
            id="duration"
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
            />
            <span className="text-sm text-[var(--color-text-primary)]">
              Free lesson (accessible without enrollment)
            </span>
          </label>
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
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
          {createMutation.isPending ? "Creating..." : "Create Lesson"}
        </button>
      </form>
    </div>
  );
}