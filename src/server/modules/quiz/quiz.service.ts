// src/server/modules/quiz/quiz.service.ts
import { db } from "@/lib/db";
import {
  quizzes,
  quizQuestions,
  quizAttempts,
  lessonProgress,
  lessons,
  courses,
  communities,
  courseEnrollments,
} from "@/lib/db/schema";
import { and, eq, inArray, asc, desc, gte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";

// ============================
// QUIZ CRUD
// ============================

export async function getQuizByLessonId(lessonId: string) {
  const quiz = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.lessonId, lessonId))
    .limit(1)
    .then((r) => r[0]);

  if (!quiz) return null;

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(asc(quizQuestions.order));

  return {
    ...quiz,
    questions: questions.map((q) => ({
      id: q.id,
      quizId: q.quizId,
      question: q.question,
      type: q.type,
      options: typeof q.options === "string" ? JSON.parse(q.options) : q.options || [],
      explanation: q.explanation,
      order: q.order,
      sourceStartSeconds: q.sourceStartSeconds,
      sourceEndSeconds: q.sourceEndSeconds,
    })),
  };
}

export async function verifyQuizOwner(quizId: string, userId: string) {
  const quiz = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1).then((r) => r[0]);
  if (!quiz) throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
  const owner = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(courses, eq(courses.id, lessons.courseId))
    .innerJoin(communities, eq(communities.id, courses.communityId))
    .where(and(eq(lessons.id, quiz.lessonId), eq(communities.ownerId, userId)))
    .limit(1);
  if (owner.length === 0) throw new TRPCError({ code: "FORBIDDEN", message: "Only the community owner can manage quizzes" });
  return quiz;
}

export async function getQuizForOwner(lessonId: string, userId: string) {
  const quiz = await getQuizByLessonId(lessonId);
  if (!quiz) return null;
  await verifyQuizOwner(quiz.id, userId);
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quiz.id)).orderBy(asc(quizQuestions.order));
  return { ...quiz, questions: questions.map((q) => ({ ...q, options: typeof q.options === "string" ? JSON.parse(q.options) : q.options || [] })) };
}

export async function getQuizWithQuestions(quizId: string) {
  const quiz = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1)
    .then((r) => r[0]);

  if (!quiz) return null;

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(asc(quizQuestions.order));

  return {
    ...quiz,
    questions: questions.map((q) => ({
      ...q,
      options: typeof q.options === "string" ? JSON.parse(q.options) : q.options || [],
    })),
  };
}

export async function createQuiz(data: {
  userId: string;
  lessonId: string;
  title?: string;
  description?: string;
  passingScore?: number;
  timeLimit?: number;
}) {
  const owner = await db.select({ id: communities.id }).from(lessons).innerJoin(courses, eq(courses.id, lessons.courseId)).innerJoin(communities, eq(communities.id, courses.communityId)).where(and(eq(lessons.id, data.lessonId), eq(communities.ownerId, data.userId))).limit(1);
  if (owner.length === 0) throw new TRPCError({ code: "FORBIDDEN", message: "Only the community owner can create quizzes" });
  const now = new Date();
  const [quiz] = await db
    .insert(quizzes)
    .values({
      id: randomUUID(),
      lessonId: data.lessonId,
      title: data.title || "Quiz",
      description: data.description || null,
      passingScore: data.passingScore || 80,
      timeLimit: data.timeLimit || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return quiz;
}

export async function createQuizQuestions(
  quizId: string,
  userId: string,
  questions: Array<{
    question: string;
    type: "multiple_choice" | "true_false";
    options: string[];
    correctAnswer: string;
    explanation?: string;
  }>
) {
  await verifyQuizOwner(quizId, userId);
  const now = new Date();
  const results = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const [question] = await db
      .insert(quizQuestions)
      .values({
        id: randomUUID(),
        quizId,
        question: q.question,
        type: q.type,
        options: JSON.stringify(q.options),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || null,
        order: i,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    results.push(question);
  }

  return results;
}

export async function updateQuiz(
  quizId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    passingScore?: number;
    timeLimit?: number;
  }
) {
  await verifyQuizOwner(quizId, userId);
  const [updated] = await db
    .update(quizzes)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(quizzes.id, quizId))
    .returning();

  return updated;
}

export async function deleteQuiz(quizId: string, userId: string) {
  await verifyQuizOwner(quizId, userId);
  await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  await db.delete(quizzes).where(eq(quizzes.id, quizId));
  return { success: true };
}

export async function deleteQuizQuestions(quizId: string, userId: string) {
  await verifyQuizOwner(quizId, userId);
  await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  return { success: true };
}

// ============================
// QUIZ ATTEMPTS
// ============================

export async function getQuizAttemptsCount(userId: string, quizId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const attempts = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.userId, userId),
        eq(quizAttempts.quizId, quizId),
        gte(quizAttempts.createdAt, startOfDay)
      )
    )
    .then((r) => r[0]?.count || 0);

  return attempts;
}

export async function startQuizAttempt(userId: string, quizId: string) {
  const attemptsToday = await getQuizAttemptsCount(userId, quizId);
  if (attemptsToday >= 3) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "You have reached the maximum of 3 quiz attempts per day. Please try again tomorrow.",
    });
  }

  const quiz = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1)
    .then((r) => r[0]);

  if (!quiz) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
  }

  const enrollment = await db
    .select({ id: courseEnrollments.id })
    .from(lessons)
    .innerJoin(courses, eq(courses.id, lessons.courseId))
    .innerJoin(courseEnrollments, and(
      eq(courseEnrollments.courseId, courses.id),
      eq(courseEnrollments.userId, userId)
    ))
    .where(eq(lessons.id, quiz.lessonId))
    .limit(1);
  if (enrollment.length === 0) throw new TRPCError({ code: "FORBIDDEN", message: "You must be enrolled to take this quiz" });

  const now = new Date();
  const expiresAt = quiz.timeLimit ? new Date(now.getTime() + quiz.timeLimit * 60 * 1000) : null;

  const [attempt] = await db
    .insert(quizAttempts)
    .values({
      id: randomUUID(),
      userId,
      quizId,
      score: 0,
      passed: false,
      answers: "{}",
      startedAt: now,
      expiresAt: expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return attempt;
}
export async function submitQuizAttempt(
  userId: string,
  attemptId: string,
  answers: Record<string, string>
) {
  const attempt = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.userId, userId)))
    .limit(1)
    .then((r) => r[0]);

  if (!attempt) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Quiz attempt not found" });
  }
  if (attempt.completedAt) {
    throw new TRPCError({ code: "CONFLICT", message: "This quiz attempt has already been submitted" });
  }
   if (attempt.expiresAt && new Date() > new Date(attempt.expiresAt)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Time limit exceeded. Please start a new attempt.",
    });
  }
  const quiz = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, attempt.quizId))
    .limit(1)
    .then((r) => r[0]);

  if (!quiz) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Quiz not found" });
  }

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id));

  let correctCount = 0;
  const gradedAnswers: Record<string, { selected: string; correct: boolean; correctAnswer: string }> = {};

  for (const q of questions) {
    const selected = answers[q.id] || "";
    const isCorrect = selected === q.correctAnswer;
    if (isCorrect) correctCount++;
    gradedAnswers[q.id] = {
      selected,
      correct: isCorrect,
      correctAnswer: q.correctAnswer,
    };
  }

  const totalQuestions = questions.length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = score >= (quiz.passingScore || 80);

  const now = new Date();
  const [updated] = await db
    .update(quizAttempts)
    .set({
      score,
      passed,
      answers: JSON.stringify(gradedAnswers),
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(quizAttempts.id, attemptId))
    .returning();

  if (passed) {
    const lesson = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.id, quiz.lessonId))
      .limit(1)
      .then((r) => r[0]);

    if (lesson) {
      const existing = await db
        .select()
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, attempt.userId),
            eq(lessonProgress.lessonId, lesson.id)
          )
        )
        .limit(1)
        .then((r) => r[0]);

      if (existing) {
        await db
          .update(lessonProgress)
          .set({
            quizPassed: true,
            completed: true,
            watchedAt: now,
            updatedAt: now,
          })
          .where(eq(lessonProgress.id, existing.id));
      } else {
        await db
          .insert(lessonProgress)
          .values({
            id: randomUUID(),
            userId: attempt.userId,
            lessonId: lesson.id,
            quizPassed: true,
            completed: true,
            watchedAt: now,
            createdAt: now,
            updatedAt: now,
          });
      }
    }
  }

  return {
    ...updated,
    gradedAnswers,
  };
}

export async function getQuizAttempts(userId: string, quizId: string) {
  return db
    .select()
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.userId, userId),
        eq(quizAttempts.quizId, quizId)
      )
    )
    .orderBy(desc(quizAttempts.createdAt));
}

export async function getLatestQuizAttempt(userId: string, quizId: string) {
  return db
    .select()
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.userId, userId),
        eq(quizAttempts.quizId, quizId)
      )
    )
    .orderBy(desc(quizAttempts.createdAt))
    .limit(1)
    .then((r) => r[0] ?? null);
}