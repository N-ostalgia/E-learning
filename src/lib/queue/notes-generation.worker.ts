import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });
import { Worker, type Job } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lessonNotes, lessonNotesJobs } from "@/lib/db/schema";
import { generateNotesFromVideoUrl } from "@/lib/ai/gemini";
import { REDIS_URL } from "./redis-connection";
import { NOTES_GENERATION_QUEUE, type NotesGenerationJobData } from "./notes-generation.queue";

async function processJob(job: Job<NotesGenerationJobData>) {
  const { jobId, lessonId, videoUrl, lessonTitle, lessonDescription } = job.data;
  await db.update(lessonNotesJobs).set({ status: "processing" }).where(eq(lessonNotesJobs.id, jobId));

  try {
    const result = await generateNotesFromVideoUrl(videoUrl, lessonTitle, lessonDescription);
    const now = new Date();
    await db.insert(lessonNotes).values({
      id: jobId,
      lessonId,
      title: result.title,
      summary: result.summary,
      keyConcepts: JSON.stringify(result.keyConcepts),
      takeaways: JSON.stringify(result.takeaways),
      generatedAt: now,
    }).onConflictDoUpdate({
      target: lessonNotes.lessonId,
      set: {
        title: result.title,
        summary: result.summary,
        keyConcepts: JSON.stringify(result.keyConcepts),
        takeaways: JSON.stringify(result.takeaways),
        generatedAt: now,
      },
    });
    await db.update(lessonNotesJobs).set({ status: "completed", completedAt: now }).where(eq(lessonNotesJobs.id, jobId));
  } catch (error) {
    throw error;
  }
}

let worker: Worker<NotesGenerationJobData> | null = null;

export function startNotesGenerationWorker() {
  if (worker) return worker;
  worker = new Worker<NotesGenerationJobData>(NOTES_GENERATION_QUEUE, processJob, {
    connection: { url: REDIS_URL },
    concurrency: 1,
  });
  worker.on("failed", async (job, error) => {
    if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
    await db.update(lessonNotesJobs).set({ status: "failed", error: error.message.slice(0, 1000) }).where(eq(lessonNotesJobs.id, job.data.jobId));
  });
  worker.on("ready", () => console.log("[notes-worker] Ready, waiting for jobs..."));
  return worker;
}

export async function stopNotesGenerationWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
}

startNotesGenerationWorker();
process.on("SIGTERM", async () => {
  await stopNotesGenerationWorker();
  process.exit(0);
});