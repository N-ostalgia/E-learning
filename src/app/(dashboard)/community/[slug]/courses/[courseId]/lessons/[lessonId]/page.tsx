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
  faPencil,
  faFilePen,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import { useState } from "react";
import { VideoPlayer } from "@/components/features/course/VideoPlayer";
import { Quiz } from "@/components/features/course/Quiz";

export default function LessonDetailPage() {
  const { slug, courseId, lessonId } = useParams<{
    slug: string;
    courseId: string;
    lessonId: string;
  }>();

  const [videoProgress, setVideoProgress] = useState(0);

  const { data: course, refetch } = trpc.course.get.useQuery({ courseId });
  const markCompleteMutation = trpc.course.markLessonComplete.useMutation({
    onSuccess: () => {
      toast.success("Lesson completed!");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const { data: quiz } = trpc.quiz.getByLesson.useQuery(
    { lessonId },
    { enabled: !!lessonId }
  );

  const lesson = course?.lessons?.find((l: any) => l.id === lessonId);
  const isEnrolled = course?.isEnrolled || false;
  const isOwner = course?.isOwner || false;
  const isCompleted = lesson?.isCompleted || false;
  const isLocked = !isEnrolled && !lesson?.isFree;
  const hasQuiz = !!quiz;
  const hasVideo = !!lesson?.videoUrl;
  
  // Check if video was already completed previously (stored in DB)
  const videoCompletedInDb = lesson?.videoCompleted || false;
  const isVideoComplete = videoCompletedInDb || videoProgress >= 80;

  const handleMarkComplete = () => {
    if (!lessonId) return;
    markCompleteMutation.mutate({ lessonId });
  };

  if (!course || !lesson) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link
          href={`/community/${slug}/courses/${courseId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
          Back to Course
        </Link>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <FontAwesomeIcon icon={faPlay} className="h-12 w-12 text-[var(--color-text-secondary)] opacity-50" />
          <h2 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">
            Lesson Locked
          </h2>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Enroll in this course to access this lesson.
          </p>
          <Link
            href={`/community/${slug}/courses/${courseId}`}
            className="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
          >
            Go to Course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <Link
          href={`/community/${slug}/courses/${courseId}`}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
          Back to Course
        </Link>
        <div className="flex items-center gap-3">
          {isOwner && (
            <Link
              href={`/community/${slug}/courses/${courseId}/lessons/${lessonId}/quiz`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
            >
              <FontAwesomeIcon icon={faPencil} className="h-3 w-3" />
              {hasQuiz ? "Edit Quiz" : "Add Quiz"}
            </Link>
          )}
          {isOwner && (
            <Link
              href={`/community/${slug}/courses/${courseId}/lessons/${lessonId}/edit`}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
            >
              <FontAwesomeIcon icon={faPencil} className="h-3 w-3" />
              Edit
            </Link>
          )}
        </div>
      </div>

      {!lesson.isPublished && (
        <div className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-500">
          <FontAwesomeIcon icon={faFilePen} className="mr-2 h-4 w-4" />
          This lesson is in draft mode and is only visible to you (course owner).
        </div>
      )}

      {hasVideo && lesson.videoUrl && (
        <div className="mt-6">
          <VideoPlayer
            lessonId={lesson.id}
            videoUrl={lesson.videoUrl}
            thumbnailUrl={lesson.thumbnailUrl}
            onProgress={(percent) => setVideoProgress(percent)}
            onComplete={() => {
              setVideoProgress(100);
              toast.success("Video complete! You can now take the quiz.");
            }}
          />
          {isEnrolled && hasVideo && (
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {isVideoComplete ? (
                <span className="text-emerald-500">Video complete! Quiz is now available.</span>
              ) : (
                `Watch ${Math.round(80 - videoProgress)}% more to unlock the quiz`
              )}
            </p>
          )}
        </div>
      )}

      <div className="mt-6">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
          {lesson.title}
          {!lesson.isPublished && (
            <span className="ml-2 text-sm font-normal text-amber-500">(Draft)</span>
          )}
        </h1>
        {lesson.duration && lesson.duration > 0 && (
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            <FontAwesomeIcon icon={faClock} className="mr-1 h-4 w-4" />
            {lesson.duration} min
          </p>
        )}
      </div>

      {lesson.description && (
        <p className="mt-4 text-[var(--color-text-secondary)]">
          {lesson.description}
        </p>
      )}

      {lesson.content && (
        <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div className="prose prose-sm max-w-none text-[var(--color-text-secondary)]">
            {lesson.content.split("\n").map((paragraph: string, i: number) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}

      {isEnrolled && hasQuiz && isVideoComplete && (
        <div className="mt-8">
          <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
            Quiz
          </h2>
          <div className="mt-4">
            <Quiz
              lessonId={lesson.id}
              onComplete={(passed: boolean) => {
                if (passed) {
                  refetch();
                  toast.success("Quiz passed! Lesson complete.");
                }
              }}
            />
          </div>
        </div>
      )}

      {isEnrolled && hasQuiz && !isVideoComplete && (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <FontAwesomeIcon icon={faLock} className="h-8 w-8 text-[var(--color-text-secondary)]" />
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Watch the video completely to unlock the quiz.
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {Math.round(80 - videoProgress)}% more to go
          </p>
        </div>
      )}

      {isEnrolled && !isCompleted && !hasQuiz && (
        <div className="mt-8">
          <button
            onClick={handleMarkComplete}
            disabled={markCompleteMutation.isPending}
            className="rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {markCompleteMutation.isPending ? "..." : "Mark Complete"}
          </button>
        </div>
      )}

      {isEnrolled && isCompleted && (
        <div className="mt-8 rounded-lg bg-emerald-500/10 p-4 text-center text-sm font-medium text-emerald-500">
          <FontAwesomeIcon icon={faCheckCircle} className="mr-2 h-5 w-5" />
          Lesson completed!
        </div>
      )}

      {isEnrolled && hasQuiz && !isCompleted && (
        <div className="mt-4 text-sm text-[var(--color-text-secondary)]">
          You must pass the quiz to complete this lesson.
        </div>
      )}
    </div>
  );
}