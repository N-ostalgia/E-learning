// src/lib/ai/groq.ts
import { z } from "zod";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  return key;
}

const GROQ_BASE = "https://api.groq.com/openai/v1";
const TEMP_DIR = path.join(process.cwd(), ".tmp");

// Ensure temp directory exists (synchronous – no top-level await)
try {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
} catch {
  // ignore – will be handled later
}

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
}

async function downloadVideo(videoUrl: string): Promise<string> {
  let resp: Response | undefined;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      resp = await fetch(videoUrl, { signal: AbortSignal.timeout(300000) });
      if (resp.ok) break;
      lastError = new Error(`HTTP ${resp.status}`);
    } catch (error) {
      lastError = error;
      console.warn(`[groq] Video download attempt ${attempt}/3 failed:`, error);
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
  if (!resp?.ok) {
    const reason = lastError instanceof Error ? `${lastError.name}: ${lastError.message}` : String(lastError);
    throw new Error(`Failed to download video after 3 attempts: ${reason}`);
  }
  const contentLength = resp.headers.get("content-length");
  const size = contentLength ? `${(Number(contentLength) / 1024 / 1024).toFixed(1)} MB` : "unknown";
  console.log(`[groq] Video size: ${size}`);

  const fileName = `video-${Date.now()}.mp4`;
  const filePath = path.join(TEMP_DIR, fileName);
  const writeStream = createWriteStream(filePath);
  await pipeline(resp.body as any, writeStream);
  return filePath;
}

export async function transcribeVideo(videoUrl: string): Promise<TranscriptionResult> {
  console.log(`[groq] Validating video URL: ${videoUrl}`);
  const videoPath = await downloadVideo(videoUrl);
  console.log(`[groq] Video downloaded: ${videoPath}`);

  const formData = new FormData();
  const fileStream = await fsp.readFile(videoPath);
  const blob = new Blob([fileStream], { type: "video/mp4" });
  formData.append("file", blob, "video.mp4");
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "verbose_json");

  console.log(`[groq] Sending video to Whisper for transcription...`);
  let resp: Response | undefined;
  let lastError: unknown;
  const transcriptionStartedAt = Date.now();
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const attemptStartedAt = Date.now();
      try {
        resp = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getGroqApiKey()}` },
          body: formData,
          signal: AbortSignal.timeout(240000),
        });
        if (resp.ok) break;

        const errorBody = await resp.text();
        lastError = new Error(`HTTP ${resp.status}: ${errorBody.slice(0, 200)}`);
        console.warn(
          `[groq] Whisper attempt ${attempt}/3 returned HTTP ${resp.status} after ${Date.now() - attemptStartedAt}ms`
        );
      } catch (error) {
        lastError = error;
        const cause = error instanceof Error && "cause" in error ? (error as Error & { cause?: unknown }).cause : undefined;
        console.warn(
          `[groq] Whisper attempt ${attempt}/3 failed after ${Date.now() - attemptStartedAt}ms:`,
          error,
          cause ? `cause=${cause instanceof Error ? cause.message : String(cause)}` : ""
        );
      }
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  } finally {
    await fsp.unlink(videoPath).catch(() => {});
    console.log(`[groq] Cleaned up temp video file`);
  }

  if (!resp) {
    const reason = lastError instanceof Error ? `${lastError.name}: ${lastError.message}` : String(lastError);
    const cause = lastError instanceof Error && "cause" in lastError
      ? (lastError as Error & { cause?: unknown }).cause
      : undefined;
    const causeText = cause ? `; cause=${cause instanceof Error ? cause.message : String(cause)}` : "";
    throw new Error(
      `Could not reach Groq Whisper after 3 attempts in ${Date.now() - transcriptionStartedAt}ms: ${reason}${causeText}`
    );
  }

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Groq transcription failed: ${resp.status} - ${err.slice(0, 200)}`);
  }
  const data = await resp.json();
  console.log(`[groq] Transcription complete`);

  const segments = (data.segments || []).map((seg: any) => ({
    text: seg.text,
    start: seg.start,
    end: seg.end,
  }));

  return {
    text: data.text || "",
    segments,
  };
}

// ---------------------------------------------------------------------
// Quiz generation – with robust JSON extraction
// ---------------------------------------------------------------------

const GeneratedQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
  correctAnswerIndex: z.number().int().min(0),
  explanation: z.string().min(1),
  sourceStartSeconds: z.number().min(0),
  sourceEndSeconds: z.number().min(0),
}).refine((q) => q.correctAnswerIndex < q.options.length, {
  message: "correctAnswerIndex out of range for options",
}).refine((q) => q.sourceEndSeconds >= q.sourceStartSeconds, {
  message: "sourceEndSeconds before sourceStartSeconds",
});

const GeneratedQuizSchema = z.object({
  title: z.string().min(1),
  questions: z.array(GeneratedQuestionSchema).min(1).max(10),
});

export type GeneratedQuiz = z.infer<typeof GeneratedQuizSchema>;

function extractJSON(text: string): unknown {
  // Try to find JSON between ```json ... ``` or just {...}
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) {
    try { return JSON.parse(match[1]); } catch {}
  }
  // Try to find the first { ... } block
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch {}
  }
  // If all else fails, try parsing the whole text
  try { return JSON.parse(text); } catch {}
  return null;
}

const QUIZ_PROMPT = (lessonTitle: string, lessonDescription?: string) => `
You are creating a quiz for an e-learning platform based on the provided transcript of a video lesson.

Lesson title: ${lessonTitle}
Lesson description: ${lessonDescription || "N/A"}

Transcript:
{transcript}

Generate 5-8 multiple-choice quiz questions that test understanding of what is taught in the video. If the transcript does not contain enough reliable information, generate fewer questions rather than inventing content.
For every question:
- Base it on real content from the transcript — do not invent facts.
- Give exactly 4 concise answer options, exactly one of which is correct.
- Give a short explanation of why the correct answer is right.
- Give the timestamp range (in whole seconds) where the answer is grounded, as sourceStartSeconds and sourceEndSeconds. Use the transcript segment timestamps and ensure sourceEndSeconds is greater than or equal to sourceStartSeconds.
- Set correctAnswerIndex to the zero-based index of the correct option.
- Return a non-empty title and non-empty strings for every text field.
- Return only the keys shown in the example; do not add or omit keys.

**IMPORTANT: Respond with ONLY one valid JSON object. Do not include reasoning, commentary, markdown, or code fences.** The JSON must have exactly this structure:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswerIndex": 0,
      "explanation": "...",
      "sourceStartSeconds": 10,
      "sourceEndSeconds": 15
    }
  ]
}
`.trim();

export async function generateQuizFromTranscript(
  transcript: TranscriptionResult,
  lessonTitle: string,
  lessonDescription?: string
): Promise<GeneratedQuiz> {
  const prompt = QUIZ_PROMPT(lessonTitle, lessonDescription).replace(
    "{transcript}",
    transcript.text
  );

  // Use the model confirmed to generate valid quiz JSON.
  const candidateModels = [
    "openai/gpt-oss-20b"
  ];

  let lastError: Error | null = null;
  for (const model of candidateModels) {
    try {
      console.log(`[groq] Trying model: ${model}`);
      const resp = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getGroqApiKey()}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that generates quiz questions in valid JSON. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.5,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!resp.ok) {
        const err = await resp.text();
        console.warn(`[groq] Model ${model} failed: ${resp.status} - ${err.slice(0, 100)}`);
        continue;
      }
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response");

      const parsed = extractJSON(content);
      if (!parsed) throw new Error("Could not extract JSON from response");

      const result = GeneratedQuizSchema.safeParse(parsed);
      if (result.success) {
        console.log(`[groq] Quiz generated with ${model}`);
        return result.data;
      } else {
        console.warn(`[groq] Validation failed for ${model}:`, result.error.format());
        continue;
      }
    } catch (error) {
      console.warn(`[groq] Error with ${model}:`, error);
      lastError = error as Error;
      continue;
    }
  }
  throw new Error(`All models failed. Last error: ${lastError?.message || "Unknown"}`);
}

export async function generateQuizFromVideoUrl(
  videoUrl: string,
  lessonTitle: string,
  lessonDescription?: string
): Promise<GeneratedQuiz> {
  console.log(`[groq] Transcribing video from URL...`);
  const transcript = await transcribeVideo(videoUrl);
  return generateQuizFromTranscript(transcript, lessonTitle, lessonDescription);
}

const GeneratedNotesSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  keyConcepts: z.array(z.object({
    term: z.string().min(1),
    explanation: z.string().min(1),
  })).min(3).max(8),
  takeaways: z.array(z.string().min(1)).min(2).max(6),
});

export type GeneratedNotes = z.infer<typeof GeneratedNotesSchema>;

const NOTES_PROMPT = (lessonTitle: string, lessonDescription?: string) => `
You are writing accurate, easy-to-skim study notes for a student based only on a video lesson transcript.

Lesson title: ${lessonTitle}
Lesson description: ${lessonDescription || "N/A"}

Transcript:
{transcript}

Create a short note title, a 2-4 sentence summary, 3-8 key concepts with plain-language explanations, and 2-6 concise takeaways. Base everything on the transcript. Do not invent facts, timestamps, or time references.

Respond with ONLY one valid JSON object using exactly this structure:
{"title":"Short note title","summary":"...","keyConcepts":[{"term":"...","explanation":"..."}],"takeaways":["...","..."]}
`.trim();

export async function generateNotesFromTranscript(
  transcript: TranscriptionResult,
  lessonTitle: string,
  lessonDescription?: string
): Promise<GeneratedNotes> {
  const resp = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getGroqApiKey()}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: "Return accurate study notes as valid JSON only." },
        { role: "user", content: NOTES_PROMPT(lessonTitle, lessonDescription).replace("{transcript}", transcript.text) },
      ],
      temperature: 0.6,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!resp.ok) {
    const error = await resp.text();
    throw new Error(`Groq notes generation failed: ${resp.status} - ${error.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Groq.");
  const parsed = extractJSON(content);
  if (!parsed) throw new Error("Could not extract JSON from Groq's response.");

  const result = GeneratedNotesSchema.safeParse(parsed);
  if (!result.success) throw new Error("Groq's notes output did not match the expected structure.");
  return result.data;
}

export async function generateNotesFromVideoUrl(
  videoUrl: string,
  lessonTitle: string,
  lessonDescription?: string
): Promise<GeneratedNotes> {
  const transcript = await transcribeVideo(videoUrl);
  return generateNotesFromTranscript(transcript, lessonTitle, lessonDescription);
}