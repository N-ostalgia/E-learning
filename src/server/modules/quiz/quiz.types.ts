// src/server/modules/quiz/quiz.types.ts
import type { quizzes, quizQuestions, quizAttempts } from "@/lib/db/schema";

export type Quiz = typeof quizzes.$inferSelect;
export type QuizInsert = typeof quizzes.$inferInsert;

export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type QuizQuestionInsert = typeof quizQuestions.$inferInsert;

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type QuizAttemptInsert = typeof quizAttempts.$inferInsert;

export interface QuizWithQuestions extends Quiz {
  questions: QuizQuestion[];
}

export interface QuizAttemptWithDetails extends QuizAttempt {
  quiz: Quiz;
}