// src/lib/queue/quiz-generation.worker.ts
//
// Exports a start function rather than auto-running on import, so it can
// be started either:
//   (a) embedded in your existing ws-server.js process (recommended),
//   (b) as its own standalone process via `tsx`.
//
// Concurrency is deliberately 1: Groq rate limits, and
// each video generates one multi-step transcription + generation flow.
// Serializing jobs keeps you under the rate limit without hand-rolled throttling.
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });
import { Worker, type Job } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizGenerationJobs } from "@/lib/db/schema";
import { REDIS_URL } from "./redis-connection";
import {
  QUIZ_GENERATION_QUEUE,
  type QuizGenerationJobData,
} from "./quiz-generation.queue";
import { generateQuizFromVideoUrl } from "@/lib/ai/gemini";

async function processJob(job: Job<QuizGenerationJobData>) {
  const { jobId, lessonId, videoUrl, lessonTitle, lessonDescription } = job.data;

  console.log(
    `[quiz-worker] Processing job ${jobId} for lesson: ${lessonTitle}`
  );

  await db
    .update(quizGenerationJobs)
    .set({ status: "processing" })
    .where(eq(quizGenerationJobs.id, jobId));

  try {
    const result = await generateQuizFromVideoUrl(
      videoUrl,
      lessonTitle,
      lessonDescription
    );

    await db
      .update(quizGenerationJobs)
      .set({
        status: "completed",
        result: JSON.stringify(result),
        completedAt: new Date(),
      })
      .where(eq(quizGenerationJobs.id, jobId));

    console.log(
      `[quiz-worker] ✅ Completed job ${jobId} for lesson ${lessonId} - Generated ${result.questions.length} questions`
    );
  } catch (error) {
    console.error(
      `[quiz-worker] ❌ Job ${jobId} failed with error:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error; // Re-throw so BullMQ's error handler can manage retries
  }
}

let worker: Worker<QuizGenerationJobData> | null = null;

export function startQuizGenerationWorker() {
  if (worker) return worker;

  worker = new Worker<QuizGenerationJobData>(
    QUIZ_GENERATION_QUEUE,
    processJob,
    {
      connection: { url: REDIS_URL },
      concurrency: 1,
    }
  );

  worker.on("failed", async (job, err) => {
    if (!job) return;
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `[quiz-worker] ❌ Job ${job.data.jobId} failed (attempt ${job.attemptsMade}/${job.opts.attempts ?? 1}):`,
      errorMsg
    );

    if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
      // All retries exhausted
      await db
        .update(quizGenerationJobs)
        .set({
          status: "failed",
          error: errorMsg.slice(0, 1000),
        })
        .where(eq(quizGenerationJobs.id, job.data.jobId));
      console.error(
        `[quiz-worker] ❌ Job ${job.data.jobId} permanently failed after all retries`
      );
    } else {
      // Will retry
      console.log(`[quiz-worker] Will retry job ${job.data.jobId}...`);
    }
  });

  worker.on("ready", () => {
    console.log("[quiz-worker] Ready, waiting for jobs...");
  });

  return worker;
}

export async function stopQuizGenerationWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
}

// ---------------------------------------------------------------------
// ✅ STANDALONE RUNNER — uncommented so the worker starts when this file
// is executed directly (e.g., via `npx tsx src/lib/queue/quiz-generation.worker.ts`).
// ---------------------------------------------------------------------

startQuizGenerationWorker();

process.on("SIGTERM", async () => {
  await stopQuizGenerationWorker();
  process.exit(0);
});