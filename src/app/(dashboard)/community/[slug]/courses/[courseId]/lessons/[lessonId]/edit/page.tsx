"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faSave,
  faTrash,
  faVideo,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import { FileUploader } from "@/components/features/upload/FileUploader";

export default function EditLessonPage() {
  const router = useRouter();
  const { slug, courseId, lessonId } = useParams<{
    slug: string;
    courseId: string;
    lessonId: string;
  }>();
  const utils = trpc.useUtils();

  const { data: course, isLoading } = trpc.course.get.useQuery({ courseId });

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

  const lesson = course?.lessons?.find((l: any) => l.id === lessonId);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setDescription(lesson.description || "");
      setContent(lesson.content || "");
      setDuration(lesson.duration || 0);
      setIsFree(lesson.isFree || false);
      setIsPublished(lesson.isPublished !== undefined && lesson.isPublished !== null ? lesson.isPublished : true);
      setVideoUrl(lesson.videoUrl);
      setVideoKey(lesson.videoKey);
      setThumbnailUrl(lesson.thumbnailUrl);
      setThumbnailKey(lesson.thumbnailKey);
    }
  }, [lesson]);

  const updateMutation = trpc.course.updateLesson.useMutation({
    onSuccess: () => {
      utils.course.get.invalidate({ courseId });
      toast.success("Lesson updated successfully");
      router.push(`/community/${slug}/courses/${courseId}/lessons/${lessonId}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const deleteMutation = trpc.course.deleteLesson.useMutation({
    onSuccess: () => {
      utils.course.get.invalidate({ courseId });
      toast.success("Lesson deleted successfully");
      router.push(`/community/${slug}/courses/${courseId}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    updateMutation.mutate({
      lessonId,
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

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this lesson?")) {
      deleteMutation.mutate({ lessonId });
    }
  };

  if (isLoading || !lesson) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-[var(--color-border)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <Link
          href={`/community/${slug}/courses/${courseId}/lessons/${lessonId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
          Back to Lesson
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="mb-6 inline-flex items-center gap-1 text-sm text-red-400 hover:text-red-500 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
          Delete Lesson
        </button>
      </div>

      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        Edit Lesson
      </h1>
      <p className="mt-1 text-[var(--color-text-secondary)]">
        Update your lesson content
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
              Video uploaded
            </div>
          )}
        </div>

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
              Published
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