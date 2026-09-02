// src/app/(dashboard)/community/[slug]/courses/[courseId]/page.tsx
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPlay,
  faCheckCircle,
  faLock,
  faClock,
  faUser,
  faPencil,
  faFilePen,
  faPlus,
  faTrash,
  faFilePdf,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import { useState } from "react";
import { CourseReviews } from "@/components/features/course/CourseReviews";

export default function CourseDetailPage() {
  const { slug, courseId } = useParams<{ slug: string; courseId: string }>();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  const { data: course, refetch } = trpc.course.get.useQuery({ courseId });
  const enrollMutation = trpc.course.enroll.useMutation({
    onSuccess: () => {
      toast.success("Enrolled in course!");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const checkoutMutation = trpc.payment.course.checkout.useMutation({
    onSuccess: (session) => {
      if (session.url) window.location.assign(session.url);
    },
    onError: (err) => {
      setIsBuying(false);
      toast.error(err.message);
    },
  });
  const markCompleteMutation = trpc.course.markLessonComplete.useMutation({
    onSuccess: () => {
      toast.success("Lesson completed!");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteLessonMutation = trpc.course.deleteLesson.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Lesson deleted successfully");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleEnroll = () => {
    setIsEnrolling(true);
    enrollMutation.mutate({ courseId });
  };

  const handlePurchase = () => {
    setIsBuying(true);
    checkoutMutation.mutate({ courseId });
  };

  const handleMarkComplete = (lessonId: string) => {
    markCompleteMutation.mutate({ lessonId });
  };

  const handleDeleteLesson = (lessonId: string, lessonTitle: string) => {
    if (confirm(`Are you sure you want to delete "${lessonTitle}"?`)) {
      deleteLessonMutation.mutate({ lessonId });
    }
  };

  if (!course) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="mt-6 h-56 animate-pulse rounded-xl bg-[var(--color-border)]" />
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-[var(--color-border)]" />
          ))}
        </div>
      </div>
    );
  }

  const isEnrolled = course.isEnrolled;
  const isOwner = course.isOwner || false;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={`/community/${slug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
        Back to Community
      </Link>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="relative h-48 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20">
          {course.imageUrl && (
            <img
              src={course.imageUrl}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          )}
          {isOwner && !course.isPublished && (
            <div className="absolute top-3 left-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white">
              <FontAwesomeIcon icon={faFilePen} className="mr-1 h-3 w-3" />
              Draft
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
                {course.title}
              </h1>
              <p className="mt-2 text-[var(--color-text-secondary)]">
                {course.description || "No description"}
              </p>
              <div className="mt-3 flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                <span>
                  <FontAwesomeIcon icon={faClock} className="mr-1 h-4 w-4" />
                  {course.lessonCount} lessons
                </span>
                {isEnrolled && (
                  <span className="text-emerald-500">
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-1 h-4 w-4" />
                    {course.progress}% complete
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isOwner && (
                <Link
                  href={`/community/${slug}/courses/${courseId}/edit`}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
                >
                  <FontAwesomeIcon icon={faPencil} className="h-4 w-4" />
                  Edit
                </Link>
              )}
              
              {/* Certificate Button - Only show when course is 100% complete */}
              {isEnrolled && course.progress === 100 && (
                <a
                  href={`/api/certificate/${course.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <FontAwesomeIcon icon={faFilePdf} className="h-4 w-4" />
                  Download Certificate
                </a>
              )}
              
              {!isEnrolled && (
                <button
                  onClick={course.price && course.price > 0 ? handlePurchase : handleEnroll}
                  disabled={isEnrolling || isBuying}
                  className="rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                >
                  {isEnrolling || isBuying
                    ? "Processing..."
                    : course.price && course.price > 0
                      ? `Buy for $${(course.price / 100).toFixed(2)}`
                      : "Enroll"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
            Lessons
          </h2>
          {isOwner && (
            <Link
              href={`/community/${slug}/courses/${courseId}/lessons/create`}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
              Add Lesson
            </Link>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {course.lessons.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
              <p className="text-[var(--color-text-secondary)]">No lessons yet.</p>
              {isOwner && (
                <Link
                  href={`/community/${slug}/courses/${courseId}/lessons/create`}
                  className="mt-2 inline-block text-sm text-[var(--color-accent)] hover:underline"
                >
                  Create the first lesson
                </Link>
              )}
            </div>
          ) : (
            course.lessons.map((lesson, index) => {
              const isCompleted = lesson.isCompleted;
              const isLocked = !isEnrolled && !lesson.isFree;

              return (
                <div
                  key={lesson.id}
                  className={`flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors ${
                    isCompleted ? "border-emerald-500/30 bg-emerald-500/5" : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-bg)] text-sm font-semibold text-[var(--color-text-secondary)]">
                      {index + 1}
                    </div>
                    <Link
                      href={`/community/${slug}/courses/${courseId}/lessons/${lesson.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)]">
                        {lesson.title}
                        {!lesson.isPublished && (
                          <span className="ml-2 text-xs text-amber-500">(Draft)</span>
                        )}
                      </p>
                      {lesson.description && (
                        <p className="truncate text-sm text-[var(--color-text-secondary)]">
                          {lesson.description}
                        </p>
                      )}
                    </Link>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    {isCompleted && (
                      <span className="text-emerald-500">
                        <FontAwesomeIcon icon={faCheckCircle} className="h-5 w-5" />
                      </span>
                    )}
                    {!isEnrolled && !lesson.isFree && (
                      <FontAwesomeIcon icon={faLock} className="h-4 w-4 text-[var(--color-text-secondary)]" />
                    )}
                    {isEnrolled && !isCompleted && (
                      <button
                        onClick={() => handleMarkComplete(lesson.id)}
                        className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
                      >
                        Mark Complete
                      </button>
                    )}
                    {isOwner && (
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/community/${slug}/courses/${courseId}/lessons/${lesson.id}/edit`}
                          className="rounded p-1 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)]"
                          title="Edit lesson"
                        >
                          <FontAwesomeIcon icon={faPencil} className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                          disabled={deleteLessonMutation.isPending}
                          className="rounded p-1 text-[var(--color-text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                          title="Delete lesson"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-8">
        <CourseReviews courseId={courseId} isEnrolled={isEnrolled} />
      </div>
    </div>
  );
}