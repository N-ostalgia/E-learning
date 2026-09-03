import { Queue } from "bullmq";
import { REDIS_URL } from "./redis-connection";

export const NOTES_GENERATION_QUEUE = "notes-generation";

export interface NotesGenerationJobData {
  jobId: string;
  lessonId: string;
  videoUrl: string;
  lessonTitle: string;
  lessonDescription?: string;
}

export const notesGenerationQueue = new Queue<NotesGenerationJobData, void, typeof NOTES_GENERATION_QUEUE>(
  NOTES_GENERATION_QUEUE,
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

export async function enqueueNotesGeneration(data: NotesGenerationJobData) {
  await notesGenerationQueue.add(NOTES_GENERATION_QUEUE, data, { jobId: data.jobId });
}