"use client";

import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faCheckCircle,
  faClock,
  faFilePdf,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";

export default function MyLearningPage() {
  const { data: myCourses, isLoading } = trpc.course.myEnrolledCourses.useQuery();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-[var(--color-border)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!myCourses || myCourses.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <FontAwesomeIcon icon={faPlay} className="h-12 w-12 text-[var(--color-text-secondary)] opacity-50" />
          <h2 className="mt-4 text-xl font-semibold text-[var(--color-text-primary)]">
            No courses yet
          </h2>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Enroll in a course to start learning
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
          >
            Discover Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
            My Learning
          </h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            Continue your learning journey
          </p>
        </div>
        <div className="text-sm text-[var(--color-text-secondary)]">
          {myCourses.length} course{myCourses.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {myCourses.map((course: any) => {
          const isComplete = course.progress === 100;

          return (
            <div
              key={course.id}
              className="group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:shadow-lg"
            >
              <div className="relative aspect-video w-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20">
                {course.imageUrl ? (
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FontAwesomeIcon icon={faPlay} className="h-12 w-12 text-[var(--color-text-secondary)] opacity-50" />
                  </div>
                )}
                {isComplete && (
                  <div className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-xs font-medium text-white">
                    Completed
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                      {course.title}
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {course.lessons} lessons
                    </p>
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {course.progress}%
                  </span>
                </div>

                <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-1.5 rounded-full bg-[var(--color-accent)] transition-all"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Link
                    href={`/community/${course.communitySlug}/courses/${course.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                  >
                    {isComplete ? "Review" : "Resume"}
                    <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                  </Link>

                  {isComplete && (
                    <a
                      href={`/api/certificate/${course.id}`}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
                    >
                      <FontAwesomeIcon icon={faFilePdf} className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}