// src/components/features/course/CourseList.tsx
"use client";

import { trpc } from "@/lib/trpc/react";
import { CourseCard } from "./CourseCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

interface CourseListProps {
  communityId: string;
  communitySlug: string;
}

export function CourseList({ communityId, communitySlug }: CourseListProps) {
  const { data: courses, isLoading, error } = trpc.course.list.useQuery({
    communityId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin text-[var(--color-text-secondary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <p className="text-sm text-red-400">{error.message}</p>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
        <p className="text-[var(--color-text-secondary)]">No courses yet. Create your first course!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={{
            id: course.id,
            title: course.title,
            description: course.description,
            imageUrl: course.imageUrl,
            price: course.price ?? 0, // Convert null to 0
            lessonCount: course.lessonCount,
            isEnrolled: course.isEnrolled,
            progress: course.progress,
            isPublished: course.isPublished ?? false,
            communityId: course.communityId,
          }}
          communitySlug={communitySlug}
          showDraftBadge={true}
        />
      ))}
    </div>
  );
}