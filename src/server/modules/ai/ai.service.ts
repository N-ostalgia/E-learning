// src/server/modules/ai/ai.service.ts

import { db } from "@/lib/db";
import {
  communities,
  communityMembers,
  courses,
  lessons,
  quizzes,
  quizQuestions,
  quizGenerationJobs,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { enqueueQuizGeneration } from "@/lib/queue/quiz-generation.queue";
import type { GeneratedQuiz } from "@/lib/ai/gemini";

// Same owner-check pattern as course.service.ts, extended to also allow
// community admins (your course.service.ts currently only checks
// ownerId — this is the isCommunityAdminOrOwner helper you sketched;
// consider moving it into community.service.ts and importing it in both
// places once you've verified it here, so course.service.ts and this
// module share one implementation instead of two copies drifting apart.
async function isCommunityAdminOrOwner(
  userId: string,
  communityId: string
): Promise<boolean> {
  const community = await db
    .select()
    .from(communities)
    .where(and(eq(communities.id, communityId), eq(communities.ownerId, userId)))
    .limit(1)
    .then((r) => r[0]);
  if (community) return true;

  const member = await db
    .select()
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.userId, userId),
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.role, "admin")
      )
    )
    .limit(1)
    .then((r) => r[0]);

  return !!member;
}

// Shared lookup: lesson -> course -> community, with the permission check
// baked in. Every AI mutation needs this, so it's factored out once.
async function getLessonWithPermissionCheck(lessonId: string, userId: string) {
  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  });
  if (!lesson) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
  }

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, lesson.courseId),
  });
  if (!course) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
  }

  const allowed = await isCommunityAdminOrOwner(userId, course.communityId);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the community owner or an admin can generate quizzes.",
    });
  }

  return { lesson, course };
}

export async function startQuizGeneration(userId: string, lessonId: string) {
  const { lesson } = await getLessonWithPermissionCheck(lessonId, userId);

  if (!lesson.videoUrl) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This lesson doesn't have a video uploaded yet.",
    });
  }

  // Don't let a double-click (or an impatient owner) burn a second Gemini
  // call while one is already running for this lesson — check both
  // "pending" AND "processing", unlike the original plan which only
  // caught "pending" and would've let a race slip through.
  const existing = await db.query.quizGenerationJobs.findFirst({
    where: and(
      eq(quizGenerationJobs.lessonId, lessonId),
      eq(quizGenerationJobs.status, "pending")
    ),
  });
  const existingProcessing = await db.query.quizGenerationJobs.findFirst({
    where: and(
      eq(quizGenerationJobs.lessonId, lessonId),
      eq(quizGenerationJobs.status, "processing")
    ),
  });
  if (existing || existingProcessing) {
    return { jobId: (existing ?? existingProcessing)!.id };
  }

  const jobId = randomUUID();
  await db.insert(quizGenerationJobs).values({
    id: jobId,
    lessonId,
    userId,
    status: "pending",
    createdAt: new Date(),
  });

  await enqueueQuizGeneration({
    jobId,
    lessonId,
    videoUrl: lesson.videoUrl,
    lessonTitle: lesson.title,
    lessonDescription: lesson.description ?? undefined,
  });

  return { jobId };
}

export async function getQuizGenerationJob(userId: string, jobId: string) {
  const job = await db.query.quizGenerationJobs.findFirst({
    where: eq(quizGenerationJobs.id, jobId),
  });
  if (!job) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
  }

  // Re-check permission via the lesson rather than trusting job.userId
  // alone — an admin who wasn't the one who started the job should still
  // be able to see/save its result.
  await getLessonWithPermissionCheck(job.lessonId, userId);

  return {
    status: job.status as "pending" | "processing" | "completed" | "failed",
    result: job.result ? (JSON.parse(job.result) as GeneratedQuiz) : null,
    error: job.error,
  };
}

export interface SaveQuizInput {
  title: string;
  questions: {
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
    sourceStartSeconds?: number;
    sourceEndSeconds?: number;
  }[];
}

export async function saveGeneratedQuiz(
  userId: string,
  jobId: string,
  input: SaveQuizInput
) {
  const job = await db.query.quizGenerationJobs.findFirst({
    where: eq(quizGenerationJobs.id, jobId),
  });
  if (!job) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
  }
  const { lesson } = await getLessonWithPermissionCheck(job.lessonId, userId);

  if (input.questions.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Quiz must have at least one question.",
    });
  }
  for (const q of input.questions) {
    if (q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `"${q.question}" has an invalid correct answer selection.`,
      });
    }
  }

  // One quiz per lesson — don't silently create a second one on top of an
  // existing (manual or previously-generated) quiz.
  const existingQuiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.lessonId, lesson.id),
  });
  if (existingQuiz) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This lesson already has a quiz. Delete the existing quiz before saving a new one.",
    });
  }

  const now = new Date();
  const [quiz] = await db
    .insert(quizzes)
    .values({
      id: randomUUID(),
      lessonId: lesson.id,
      title: input.title,
      description: "AI-generated from the lesson video",
      passingScore: 80,
      timeLimit: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(quizQuestions).values(
    input.questions.map((q, i) => ({
      id: randomUUID(),
      quizId: quiz.id,
      question: q.question,
      type: "multiple_choice",
      options: JSON.stringify(q.options),
      correctAnswer: q.options[q.correctAnswerIndex],
      explanation: q.explanation,
      order: i,
      sourceStartSeconds: q.sourceStartSeconds ?? null,
      sourceEndSeconds: q.sourceEndSeconds ?? null,
      createdAt: now,
      updatedAt: now,
    }))
  );

  await db
    .update(quizGenerationJobs)
    .set({ status: "completed", completedAt: now })
    .where(eq(quizGenerationJobs.id, jobId));

  return { quizId: quiz.id };
}

export async function discardQuizGenerationJob(userId: string, jobId: string) {
  const job = await db.query.quizGenerationJobs.findFirst({
    where: eq(quizGenerationJobs.id, jobId),
  });
  if (!job) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
  }
  await getLessonWithPermissionCheck(job.lessonId, userId);

  await db.delete(quizGenerationJobs).where(eq(quizGenerationJobs.id, jobId));
  return { success: true };
}