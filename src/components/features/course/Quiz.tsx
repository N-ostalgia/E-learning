"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
  faClock,
  faSpinner,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

interface QuizProps {
  lessonId: string;
  onComplete?: (passed: boolean) => void;
}

interface GradedAnswer {
  selected: string;
  correct: boolean;
}

export function Quiz({ lessonId, onComplete }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [results, setResults] = useState<{ passed: boolean; score: number } | null>(null);
  const [gradedAnswers, setGradedAnswers] = useState<Record<string, GradedAnswer> | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [hasPassed, setHasPassed] = useState(false);

  const { data: quizData, refetch, error } = trpc.quiz.getByLesson.useQuery(
    { lessonId },
    { 
      enabled: !!lessonId,
      retry: false,
    }
  );

  const { data: attemptsCount, refetch: refetchAttempts } = trpc.quiz.attemptsCount.useQuery(
    { quizId: quizData?.id || "" },
    { enabled: !!quizData?.id }
  );

  const { data: latestAttempt } = trpc.quiz.latestAttempt.useQuery(
    { quizId: quizData?.id || "" },
    { enabled: !!quizData?.id }
  );

  const { data: timeData } = trpc.quiz.checkTime.useQuery(
    { attemptId: attemptId || "" },
    { enabled: !!attemptId, refetchInterval: 1000 }
  );

  //  Check if user has already passed this quiz
  useEffect(() => {
    if (latestAttempt?.passed) {
      setHasPassed(true);
      onComplete?.(true);
    }
  }, [latestAttempt]);

  const startAttemptMutation = trpc.quiz.startAttempt.useMutation({
    onSuccess: (data) => {
      setAttemptId(data.id);
      setQuizStarted(true);
      setAttemptsLeft(3 - (attemptsCount || 0) - 1);
      refetchAttempts();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const submitAttemptMutation = trpc.quiz.submitAttempt.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      setResults({
        passed: data.passed,
        score: data.score,
      });
      setGradedAnswers(data.gradedAnswers || null);
      setShowResults(true);
      
      if (data.passed) {
        setHasPassed(true);
        onComplete?.(true);
        toast.success("Quiz passed!");
      } else {
        toast.error("Quiz failed. Try again.");
        //  Refresh attempts count after failed attempt
        refetchAttempts();
      }
      refetch();
    },
    onError: (err) => {
      setIsSubmitting(false);
      toast.error(err.message);
    },
  });

  const quiz = quizData
    ? {
        ...quizData,
        questions: (quizData.questions || []).map((q: any) => ({
          ...q,
          options: typeof q.options === "string" ? JSON.parse(q.options) : q.options || [],
        })),
      }
    : null;

  // Timer logic
  useEffect(() => {
    if (timeData) {
      setTimeRemaining(timeData.remainingSeconds);
      if (timeData.expired && !timeExpired) {
        setTimeExpired(true);
        setIsSubmitting(true);
        toast.error("Time limit exceeded! Submitting your answers...");
        if (attemptId && quiz) {
          submitAttemptMutation.mutate({
            attemptId,
            answers: selectedAnswers,
          });
        }
      }
    }
  }, [timeData]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartQuiz = () => {
    if (!quiz) return;
    //  Check if already passed before starting
    if (hasPassed) {
      toast.info("You have already passed this quiz!");
      return;
    }
    setResults(null);
    setGradedAnswers(null);
    setShowResults(false);
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setTimeExpired(false);
    setTimeRemaining(null);
    startAttemptMutation.mutate({ quizId: quiz.id });
  };

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    if (!attemptId || !quiz) return;
    if (timeExpired) {
      toast.error("Time has expired. Please start a new attempt.");
      return;
    }
    if (hasPassed) {
      toast.info("You have already passed this quiz!");
      return;
    }
    setIsSubmitting(true);
    submitAttemptMutation.mutate({
      attemptId,
      answers: selectedAnswers,
    });
  };

  const attemptsUsed = attemptsCount || 0;
  const maxAttempts = 3;
  const remainingAttempts = Math.max(0, maxAttempts - attemptsUsed);
  const hasTimeLimit = quiz?.timeLimit && quiz.timeLimit > 0;

  //  If already passed, show success message
  if (hasPassed) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <FontAwesomeIcon icon={faCheckCircle} className="h-12 w-12 text-emerald-500" />
        <h3 className="mt-4 text-xl font-bold text-[var(--color-text-primary)]">Quiz Passed!</h3>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          You have already completed this quiz successfully.
        </p>
      </div>
    );
  }

  //  If error is NOT_FOUND, show "No quiz" message
  if (error) {
    if (error.data?.code === "NOT_FOUND") {
      return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">No quiz for this lesson yet.</p>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <p className="text-sm text-red-400">Failed to load quiz: {error.message}</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <p className="text-[var(--color-text-secondary)]">No quiz for this lesson.</p>
      </div>
    );
  }

  // Results View
  if (showResults && results) {
    const questions = quiz.questions || [];
    const passed = results.passed;

    return (
      <div className="space-y-6">
        <div
          className={`rounded-xl border p-6 text-center ${
            passed
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-red-500/30 bg-red-500/5"
          }`}
        >
          <div className={`text-4xl ${passed ? "text-emerald-500" : "text-red-500"}`}>
            <FontAwesomeIcon
              icon={passed ? faCheckCircle : faTimesCircle}
              className="h-12 w-12"
            />
          </div>
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            {passed ? "Quiz Passed!" : "Quiz Failed"}
          </h3>
          <p className="text-[var(--color-text-secondary)]">
            Score: {results.score}% (Passing: {quiz.passingScore || 80}%)
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Review Your Answers</h3>
          {questions.map((q: any, index: number) => {
            const answer = gradedAnswers?.[q.id];
            const isCorrect = answer?.correct || false;
            const userAnswer = answer?.selected || "Not answered";

            return (
              <div
                key={q.id}
                className={`rounded-lg border p-4 ${
                  isCorrect
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isCorrect ? (
                      <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <FontAwesomeIcon icon={faTimesCircle} className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--color-text-primary)]">
                      Question {index + 1}: {q.question}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className={isCorrect ? "text-emerald-500" : "text-red-400"}>
                        Your answer: {userAnswer}
                      </p>
                      {!isCorrect && (
                        <p className="text-emerald-500">Correct answer: {q.correctAnswer}</p>
                      )}
                      {q.explanation && (
                        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                          <span className="font-medium">Explanation:</span> {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!passed && remainingAttempts > 0 && (
          <button
            onClick={handleStartQuiz}
            disabled={startAttemptMutation.isPending}
            className="mt-4 rounded-lg bg-[var(--color-accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {startAttemptMutation.isPending ? "Starting..." : `Retry Quiz (${remainingAttempts} attempts left)`}
          </button>
        )}
        {!passed && remainingAttempts === 0 && (
          <p className="mt-4 text-sm text-red-400">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 h-4 w-4" />
            You have used all 3 attempts for today. Please try again tomorrow.
          </p>
        )}
        {passed && (
          <div className="text-center text-sm text-emerald-500">
            <FontAwesomeIcon icon={faCheckCircle} className="mr-2 h-4 w-4" />
            Lesson complete! You can move to the next lesson.
          </div>
        )}
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          {quiz.title || "Quiz"}
        </h3>
        {quiz.description && (
          <p className="mt-2 text-[var(--color-text-secondary)]">{quiz.description}</p>
        )}
        <div className="mt-4 text-sm text-[var(--color-text-secondary)]">
          <p>{quiz.questions?.length || 0} questions</p>
          {hasTimeLimit && (
            <p>
              <FontAwesomeIcon icon={faClock} className="mr-1 h-4 w-4" />
              {quiz.timeLimit} minutes
            </p>
          )}
          <p>Passing score: {quiz.passingScore || 80}%</p>
          <p className="mt-2">
            <span className="font-medium text-[var(--color-text-primary)]">
              {remainingAttempts} attempt{remainingAttempts !== 1 ? "s" : ""} remaining today
            </span>
          </p>
        </div>
        {remainingAttempts > 0 ? (
          <button
            onClick={handleStartQuiz}
            disabled={startAttemptMutation.isPending}
            className="mt-6 rounded-lg bg-[var(--color-accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {startAttemptMutation.isPending ? "Starting..." : "Start Quiz"}
          </button>
        ) : (
          <div className="mt-6 rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 h-4 w-4" />
            You have used all 3 attempts for today. Please try again tomorrow.
          </div>
        )}
      </div>
    );
  }

  const questions = quiz.questions || [];
  const current = questions[currentQuestion];
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;
  const isLastQuestion = currentQuestion === questions.length - 1;
  const allAnswered = questions.every((q: any) => selectedAnswers[q.id]);

  if (!current) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <p className="text-[var(--color-text-secondary)]">No questions found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-secondary)]">
          Attempt {3 - remainingAttempts + 1} of 3 today
        </span>
        {timeRemaining !== null && hasTimeLimit && (
          <span className="flex items-center gap-2 text-xs">
            <FontAwesomeIcon icon={faClock} className="h-3 w-3 text-[var(--color-text-secondary)]" />
            <span className={`font-mono font-medium ${timeRemaining < 60 ? "text-red-500" : "text-[var(--color-text-secondary)]"}`}>
              {formatTime(timeRemaining)}
            </span>
          </span>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-secondary)]">
          Question {currentQuestion + 1} of {questions.length}
        </span>
        <span className="text-sm text-[var(--color-text-secondary)]">
          {Math.round(progress)}% complete
        </span>
      </div>

      <div className="mb-4 h-1.5 w-full rounded-full bg-[var(--color-border)]">
        <div
          className="h-1.5 rounded-full bg-[var(--color-accent)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div>
        <p className="mb-4 text-lg font-medium text-[var(--color-text-primary)]">
          {current.question}
        </p>

        <div className="space-y-2">
          {current.options && current.options.length > 0 ? (
            current.options.map((option: string, index: number) => {
              const isSelected = selectedAnswers[current.id] === option;
              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(current.id, option)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    isSelected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
                  }`}
                >
                  <span className="inline-block w-6 font-medium text-[var(--color-text-secondary)]">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                </button>
              );
            })
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">No options available.</p>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion((prev) => prev - 1)}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
            >
              Previous
            </button>
          )}
          {!isLastQuestion && (
            <button
              onClick={() => setCurrentQuestion((prev) => prev + 1)}
              disabled={!selectedAnswers[current.id]}
              className="ml-auto rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
            >
              Next
            </button>
          )}
          {isLastQuestion && (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting || timeExpired || hasPassed}
              className="ml-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : timeExpired ? (
                "Time Expired"
              ) : hasPassed ? (
                "Already Passed"
              ) : (
                "Submit Quiz"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}