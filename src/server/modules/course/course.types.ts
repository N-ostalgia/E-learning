// src/server/modules/course/course.types.ts
import type { courses, lessons, courseEnrollments, lessonProgress } from "@/lib/db/schema";

export type Course = typeof courses.$inferSelect;
export type CourseInsert = typeof courses.$inferInsert;

export type Lesson = typeof lessons.$inferSelect;
export type LessonInsert = typeof lessons.$inferInsert;

export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type LessonProgress = typeof lessonProgress.$inferSelect;

export interface CourseWithLessons extends Course {
  lessons: Lesson[];
  enrollment?: CourseEnrollment | null;
  lessonCount: number;
  completedLessonCount: number;
  isEnrolled: boolean;
}

export interface LessonWithProgress extends Lesson {
  progress?: LessonProgress | null;
  isCompleted: boolean;
}