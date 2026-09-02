// src/components/features/course/QuizGenerator.tsx
"use client";

import { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWandMagicSparkles,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faTrash,
  faPlay,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

interface EditableQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  sourceStartSeconds?: number;
  sourceEndSeconds?: number;
}

interface QuizGeneratorProps {
  lessonId: string;
  lessonTitle: string;
  videoUrl: string | null;
  onQuizGenerated?: () => void;
}

function formatSeconds(s?: number): string {
  if (s === undefined) return "--:--";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function QuizGenerator({
  lessonId,
  lessonTitle,
  videoUrl,
  onQuizGenerated,
}: QuizGeneratorProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<EditableQuestion[] | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const utils = trpc.useUtils();

  const generateMutation = trpc.ai.generateQuiz.useMutation({
    onSuccess: (data) => {
      setJobId(data.jobId);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Real tRPC polling instead of a hand-rolled raw fetch against the HTTP
  // endpoint — type-safe, and stops automatically once the job settles.
  const { data: job } = trpc.ai.getJobStatus.useQuery(
    { jobId: jobId! },
    {
      enabled: !!jobId,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "pending" || status === "processing" ? 3000 : false;
      },
    }
  );

  // Load the generated result into editable local state the first time it
  // completes, so the owner can tweak/delete questions before saving.
  const [loadedJobId, setLoadedJobId] = useState<string | null>(null);
  if (job?.status === "completed" && job.result && loadedJobId !== jobId) {
    setLoadedJobId(jobId);
    setQuizTitle(job.result.title);
    setQuestions(
      job.result.questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation,
        sourceStartSeconds: q.sourceStartSeconds,
        sourceEndSeconds: q.sourceEndSeconds,
      }))
    );
  }

  const saveMutation = trpc.ai.saveGeneratedQuiz.useMutation({
    onSuccess: () => {
      toast.success("Quiz saved!");
      reset();
      onQuizGenerated?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const discardMutation = trpc.ai.discardJob.useMutation({
    onSuccess: () => reset(),
    onError: (err) => toast.error(err.message),
  });

  const reset = () => {
    setJobId(null);
    setLoadedJobId(null);
    setQuestions(null);
    setQuizTitle("");
    utils.ai.getJobStatus.invalidate();
  };

  const handleGenerate = () => {
    if (!videoUrl) {
      toast.error("Upload a video for this lesson before generating a quiz.");
      return;
    }
    generateMutation.mutate({ lessonId });
  };

  const handleSave = () => {
    if (!jobId || !questions || questions.length === 0) return;
    saveMutation.mutate({
      jobId,
      title: quizTitle || `${lessonTitle} — Quiz`,
      questions,
    });
  };

  const updateQuestion = (index: number, patch: Partial<EditableQuestion>) => {
    setQuestions((prev) =>
      prev ? prev.map((q, i) => (i === index ? { ...q, ...patch } : q)) : prev
    );
  };

  const deleteQuestion = (index: number) => {
    setQuestions((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  };

  const jumpTo = (seconds?: number) => {
    if (seconds === undefined || !videoRef.current) return;
    videoRef.current.currentTime = seconds;
    videoRef.current.play();
  };

  const isBusy =
    generateMutation.isPending ||
    job?.status === "pending" ||
    job?.status === "processing";

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--color-text-primary)]">
            AI Quiz Generator
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Generate quiz questions from this lesson's video, grounded in
            specific timestamps.
          </p>
        </div>
        {!jobId && (
          <button
            onClick={handleGenerate}
            disabled={isBusy}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} className="h-4 w-4" />
            {isBusy ? "Starting..." : "Generate Quiz with AI"}
          </button>
        )}
      </div>

      {jobId && (job?.status === "pending" || job?.status === "processing") && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
          <span className="text-[var(--color-text-secondary)]">
            AI is watching the video and drafting questions — this can take
            a couple of minutes for longer videos.
          </span>
        </div>
      )}

      {jobId && job?.status === "failed" && (
        <div className="mt-4 flex items-start gap-2 text-sm">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5 h-4 w-4 text-red-500" />
          <div>
            <p className="text-red-600">Generation failed: {job.error || "Unknown error."}</p>
            <button
              onClick={reset}
              className="mt-1 text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {jobId && job?.status === "completed" && questions && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4" />
            Draft ready — review each question below before saving.
          </div>

          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full rounded-lg border border-[var(--color-border)]"
            />
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              Quiz title
            </label>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={idx} className="rounded-lg border border-[var(--color-border)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                    rows={2}
                    className="w-full flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                  />
                  <button
                    onClick={() => deleteQuestion(idx)}
                    aria-label="Delete question"
                    className="flex-shrink-0 rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-red-50 hover:text-red-600"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2 space-y-1.5">
                  {q.options.map((opt, oIdx) => (
                    <label key={oIdx} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={q.correctAnswerIndex === oIdx}
                        onChange={() => updateQuestion(idx, { correctAnswerIndex: oIdx })}
                        className="accent-[var(--color-accent)]"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...q.options];
                          newOptions[oIdx] = e.target.value;
                          updateQuestion(idx, { options: newOptions });
                        }}
                        className={`flex-1 rounded-lg border px-2 py-1 outline-none focus:border-[var(--color-accent)] ${
                          q.correctAnswerIndex === oIdx
                            ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-700"
                            : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                        }`}
                      />
                    </label>
                  ))}
                </div>

                <textarea
                  value={q.explanation}
                  onChange={(e) => updateQuestion(idx, { explanation: e.target.value })}
                  rows={2}
                  placeholder="Explanation shown after answering..."
                  className="mt-2 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-accent)]"
                />

                {q.sourceStartSeconds !== undefined && (
                  <button
                    onClick={() => jumpTo(q.sourceStartSeconds)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white"
                  >
                    <FontAwesomeIcon icon={faPlay} className="h-2.5 w-2.5" />
                    Verify at {formatSeconds(q.sourceStartSeconds)}–
                    {formatSeconds(q.sourceEndSeconds)}
                  </button>
                )}
              </div>
            ))}
          </div>

          {questions.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              All questions removed — add at least one back or discard this draft.
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending || questions.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {saveMutation.isPending ? "Saving..." : "Save Quiz"}
            </button>
            <button
              onClick={() => discardMutation.mutate({ jobId })}
              disabled={discardMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
            >
              <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}