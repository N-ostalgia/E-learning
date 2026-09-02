// src/app/(dashboard)/community/[slug]/courses/[courseId]/lessons/[lessonId]/quiz/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSave, faPlus, faTrash, faWandMagicSparkles, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { faCheckCircle } from "@fortawesome/free-regular-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

interface Question {
  id: string;
  question: string;
  type: "multiple_choice" | "true_false";
  options: string[];
  correctAnswer: string;
  explanation?: string;
  sourceStartSeconds?: number;
  sourceEndSeconds?: number;
}

export default function QuizPage() {
  const router = useRouter();
  const { slug, courseId, lessonId } = useParams<{
    slug: string;
    courseId: string;
    lessonId: string;
  }>();
  const utils = trpc.useUtils();

  const { data: quizData, isLoading } = trpc.quiz.getByLesson.useQuery(
    { lessonId },
    { enabled: !!lessonId }
  );

  // AI generation state
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passingScore, setPassingScore] = useState(80);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([
    { id: "1", question: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!quizData;

  // Load quiz data if editing
  useEffect(() => {
    if (quizData) {
      setTitle(quizData.title || "");
      setDescription(quizData.description || "");
      setPassingScore(quizData.passingScore || 80);
      setTimeLimit(quizData.timeLimit || null);
      setQuestions(
        (quizData.questions || []).map((q: any, index: number) => ({
          id: String(index + 1),
          question: q.question,
          type: q.type || "multiple_choice",
          options: typeof q.options === "string" ? JSON.parse(q.options) : q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || "",
          sourceStartSeconds: q.sourceStartSeconds,
          sourceEndSeconds: q.sourceEndSeconds,
        }))
      );
    }
  }, [quizData]);

  // --- AI Generation ---
  const generateMutation = trpc.ai.generateQuiz.useMutation({
    onSuccess: (data) => {
      setAiJobId(data.jobId);
      setIsGenerating(true);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsGenerating(false);
    },
  });

  // Poll for AI job status (only when jobId is set)
  const { data: job } = trpc.ai.getJobStatus.useQuery(
    { jobId: aiJobId! },
    {
      enabled: !!aiJobId,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "pending" || status === "processing" ? 3000 : false;
      },
    }
  );

  // When AI job completes, pre-fill the form
  useEffect(() => {
    if (job?.status === "completed" && job.result) {
      const { title: aiTitle, questions: aiQuestions } = job.result;
      setTitle(aiTitle || `${lessonId} Quiz`);
      setQuestions(
        aiQuestions.map((q: any, idx: number) => ({
          id: String(idx + 1),
          question: q.question,
          type: "multiple_choice",
          options: q.options,
          correctAnswer: q.options[q.correctAnswerIndex],
          explanation: q.explanation || "",
          sourceStartSeconds: q.sourceStartSeconds,
          sourceEndSeconds: q.sourceEndSeconds,
        }))
      );
      setIsGenerating(false);
      toast.success("AI generated questions! Review and save.");
    }
    if (job?.status === "failed") {
      setIsGenerating(false);
      toast.error("AI generation failed: " + (job.error || "Unknown error"));
    }
  }, [job]);

  const handleAIGenerate = () => {
    // Get lesson video URL (we need to fetch lesson details – we can get it from the course data)
    // Assuming we have a way to get videoUrl. Let's fetch it.
    // For simplicity, we'll call the mutation without videoUrl; the service will fetch it from lesson.
    generateMutation.mutate({ lessonId });
  };

  // --- CRUD mutations ---
  const createMutation = trpc.quiz.create.useMutation({
    onSuccess: () => {
      utils.quiz.getByLesson.invalidate({ lessonId });
      toast.success("Quiz created successfully!");
      router.push(`/community/${slug}/courses/${courseId}/lessons/${lessonId}`);
    },
    onError: (err) => setError(err.message),
  });

  const updateMutation = trpc.quiz.update.useMutation({
    onSuccess: () => {
      utils.quiz.getByLesson.invalidate({ lessonId });
      toast.success("Quiz updated successfully!");
      router.push(`/community/${slug}/courses/${courseId}/lessons/${lessonId}`);
    },
    onError: (err) => setError(err.message),
  });

  const deleteQuestionsMutation = trpc.quiz.deleteQuestions.useMutation({
    onError: (err) => toast.error("Failed to update questions: " + err.message),
  });

  const createQuestionsMutation = trpc.quiz.createQuestions.useMutation({
    onError: (err) => toast.error("Failed to save questions: " + err.message),
  });

  // --- Form helpers ---
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: String(questions.length + 1),
        question: "",
        type: "multiple_choice",
        options: ["", "", "", ""],
        correctAnswer: "",
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error("You need at least one question");
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleTypeChange = (index: number, newType: "multiple_choice" | "true_false") => {
    const updated = [...questions];
    updated[index].type = newType;
    if (newType === "true_false") {
      updated[index].options = ["True", "False"];
      if (updated[index].correctAnswer !== "True" && updated[index].correctAnswer !== "False") {
        updated[index].correctAnswer = "";
      }
    } else {
      updated[index].options = ["", "", "", ""];
      updated[index].correctAnswer = "";
    }
    setQuestions(updated);
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    for (const q of questions) {
      if (!q.question || q.question.trim() === "") {
        toast.error("All questions must have text");
        return;
      }
      if (q.type === "multiple_choice") {
        if (q.options.some((o) => !o || o.trim() === "")) {
          toast.error("All options for multiple choice questions must have text");
          return;
        }
      }
      if (!q.correctAnswer || q.correctAnswer.trim() === "") {
        toast.error("Each question must have a correct answer");
        return;
      }
    }

    if (isEditing && quizData) {
      try {
        await updateMutation.mutateAsync({
          quizId: quizData.id,
          title: title || undefined,
          description: description || undefined,
          passingScore,
          timeLimit: timeLimit || undefined,
        });
        await deleteQuestionsMutation.mutateAsync({ quizId: quizData.id });
        await createQuestionsMutation.mutateAsync({
          quizId: quizData.id,
          questions: questions.map((q) => ({
            question: q.question,
            type: q.type,
            options: q.type === "true_false" ? ["True", "False"] : q.options.filter((o) => o.trim()),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            sourceStartSeconds: q.sourceStartSeconds,
            sourceEndSeconds: q.sourceEndSeconds,
          })),
        });
        toast.success("Quiz updated successfully!");
        utils.quiz.getByLesson.invalidate({ lessonId });
        router.push(`/community/${slug}/courses/${courseId}/lessons/${lessonId}`);
      } catch (err: any) {
        setError(err.message || "Failed to update quiz");
      }
    } else {
      createMutation.mutate({
        lessonId,
        title: title || undefined,
        description: description || undefined,
        passingScore,
        timeLimit: timeLimit || undefined,
        questions: questions.map((q) => ({
          question: q.question,
          type: q.type,
          options: q.type === "true_false" ? ["True", "False"] : q.options.filter((o) => o.trim()),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          sourceStartSeconds: q.sourceStartSeconds,
          sourceEndSeconds: q.sourceEndSeconds,
        })),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-[var(--color-border)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href={`/community/${slug}/courses/${courseId}/lessons/${lessonId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 text-current" />
        Back to Lesson
      </Link>

      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        {isEditing ? "Edit Quiz" : "Create Quiz"}
      </h1>
      <p className="mt-1 text-[var(--color-text-secondary)]">
        {isEditing ? "Update your quiz settings and questions" : "Add a quiz to test your students' knowledge"}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* AI Generator Button at the top */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)]">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="mr-2 h-4 w-4 text-[var(--color-accent)]" />
                AI Quiz Generator
              </h4>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Generate questions from your lesson video. (Requires a video uploaded to the lesson)
              </p>
            </div>
            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={isGenerating || generateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
            >
              <FontAwesomeIcon
                icon={isGenerating ? faSpinner : faWandMagicSparkles}
                className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`}
              />
              {isGenerating ? "Generating..." : "Generate with AI"}
            </button>
          </div>
          {isGenerating && (
            <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
              <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
              AI is analyzing the video... This may take a moment.
            </div>
          )}
        </div>

        {/* Quiz metadata */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Quiz Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. HTML Fundamentals Quiz"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What does this quiz cover?"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              Passing Score (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
              Time Limit (minutes, optional)
            </label>
            <input
              type="number"
              min={1}
              value={timeLimit || ""}
              onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : null)}
              placeholder="No limit"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </div>
        </div>

        {/* Questions */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--color-text-primary)]">Questions</h2>
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
            >
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
              Add Question
            </button>
          </div>

          <div className="mt-4 space-y-6">
            {questions.map((q, qIndex) => (
              <div
                key={q.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-[var(--color-text-primary)]">
                    Question {qIndex + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="text-red-400 hover:text-red-500"
                  >
                    <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                      Question Text
                    </label>
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                      placeholder="Enter your question"
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                      Question Type
                    </label>
                    <select
                      value={q.type}
                      onChange={(e) => handleTypeChange(qIndex, e.target.value as "multiple_choice" | "true_false")}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True / False</option>
                    </select>
                  </div>

                  {q.type === "multiple_choice" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                        Options
                      </label>
                      {q.options.map((option, oIndex) => (
                        <input
                          key={oIndex}
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          className="mb-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                        />
                      ))}
                    </div>
                  )}

                  {q.type === "true_false" && (
                    <div className="rounded-lg bg-[var(--color-bg)] p-3 text-sm text-[var(--color-text-secondary)]">
                      <FontAwesomeIcon icon={faCheckCircle} className="mr-2 h-4 w-4 text-emerald-500" />
                      True/False options are automatically set.
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                      Correct Answer
                    </label>
                    {q.type === "true_false" ? (
                      <select
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(qIndex, "correctAnswer", e.target.value)}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                      >
                        <option value="">Select correct answer</option>
                        <option value="True">True</option>
                        <option value="False">False</option>
                      </select>
                    ) : (
                      <select
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(qIndex, "correctAnswer", e.target.value)}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                      >
                        <option value="">Select correct answer</option>
                        {q.options.map((opt, oIndex) => (
                          opt && opt.trim() && (
                            <option key={oIndex} value={opt}>
                              {opt}
                            </option>
                          )
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                      Explanation (optional)
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ""}
                      onChange={(e) => updateQuestion(qIndex, "explanation", e.target.value)}
                      placeholder="Explain why this answer is correct"
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            createMutation.isPending ||
            updateMutation.isPending ||
            deleteQuestionsMutation.isPending ||
            createQuestionsMutation.isPending
          }
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          <FontAwesomeIcon icon={faSave} className="h-4 w-4" />
          {createMutation.isPending || updateMutation.isPending || deleteQuestionsMutation.isPending || createQuestionsMutation.isPending
            ? "Saving..."
            : isEditing
            ? "Update Quiz"
            : "Create Quiz"}
        </button>
      </form>
    </div>
  );
}