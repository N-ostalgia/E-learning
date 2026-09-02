// src/components/features/course/CourseCard.tsx
"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faLock,
  faCheckCircle,
  faClock,
  faFilePen,
} from "@fortawesome/free-solid-svg-icons";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    price: number | null;
    lessonCount: number;
    isEnrolled: boolean;
    progress: number;
    isPublished: boolean;
    communityId: string;
  };
  communitySlug: string;
  showDraftBadge?: boolean;
}

export function CourseCard({ course, communitySlug, showDraftBadge = false }: CourseCardProps) {
  const isFree = course.price === 0 || course.price === null;
  const isComplete = course.progress === 100;
  const isEnrolled = course.isEnrolled;
  const priceDisplay = course.price ? (course.price / 100).toFixed(2) : "0.00";
  const isDraft = !course.isPublished;

  return (
    <Link
      href={`/community/${communitySlug}/courses/${course.id}`}
      className="group block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:shadow-lg hover:border-[var(--color-accent)]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20">
        {course.imageUrl ? (
          <img
            src={course.imageUrl}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FontAwesomeIcon
              icon={faPlay}
              className="h-12 w-12 text-[var(--color-text-secondary)] opacity-50"
            />
          </div>
        )}

        {/* Draft Badge */}
        {showDraftBadge && isDraft && (
          <div className="absolute top-2 left-2 rounded-full bg-amber-500 px-2 py-1 text-xs font-medium text-white">
            <FontAwesomeIcon icon={faFilePen} className="mr-1 h-3 w-3" />
            Draft
          </div>
        )}

        {isEnrolled && (
          <div className="absolute bottom-2 right-2 rounded-full bg-emerald-500 px-2 py-1 text-xs font-medium text-white">
            {isComplete ? (
              <>
                <FontAwesomeIcon icon={faCheckCircle} className="mr-1 h-3 w-3" />
                Completed
              </>
            ) : (
              `${course.progress}%`
            )}
          </div>
        )}
        {!isEnrolled && !isFree && course.price && course.price > 0 && (
          <div className="absolute bottom-2 right-2 rounded-full bg-amber-500 px-2 py-1 text-xs font-medium text-white">
            ${priceDisplay}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] line-clamp-1">
          {course.title}
          {showDraftBadge && isDraft && (
            <span className="ml-2 text-xs font-normal text-amber-500">(Draft)</span>
          )}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
          {course.description || "No description"}
        </p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-secondary)]">
            <FontAwesomeIcon icon={faClock} className="mr-1 h-3 w-3" />
            {course.lessonCount} lesson{course.lessonCount !== 1 ? "s" : ""}
          </span>
          <span
            className={`text-xs font-medium ${
              isFree
                ? "text-emerald-500"
                : isEnrolled
                ? "text-emerald-500"
                : "text-amber-500"
            }`}
          >
            {isEnrolled ? "Enrolled" : isFree ? "Free" : `$${priceDisplay}`}
          </span>
        </div>
      </div>
    </Link>
  );
}