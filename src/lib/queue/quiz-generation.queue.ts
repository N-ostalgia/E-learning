// src/lib/queue/quiz-generation.queue.ts
//
// The BullMQ queue definition. This file is shared between the router (enqueue)
// and the worker (process). Uses a Redis URL string for connection to avoid
// ioredis version conflicts.

import { Queue } from "bullmq";
import { REDIS_URL } from "./redis-connection";

export const QUIZ_GENERATION_QUEUE = "quiz-generation";

export interface QuizGenerationJobData {
  jobId: string; // primary key in quizGenerationJobs table
  lessonId: string;
  videoUrl: string;
  lessonTitle: string;
  lessonDescription?: string;
}

export const quizGenerationQueue = new Queue<QuizGenerationJobData>(
  QUIZ_GENERATION_QUEUE,
  {
    connection: { url: REDIS_URL },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  }
);

/**
 * Enqueue a quiz generation job.
 * Deduplicates by jobId (BullMQ's jobId option).
 */
export async function enqueueQuizGeneration(data: QuizGenerationJobData) {
  await quizGenerationQueue.add(QUIZ_GENERATION_QUEUE, data, {
    jobId: data.jobId,
  });
}