"use client";

import { useEffect, useState } from "react";
import { Caveat } from "next/font/google";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb, faSpinner, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600", "700"] });

export function LessonNotes({
  lessonId,
  hasVideo,
  isOwnerOrAdmin,
}: {
  lessonId: string;
  hasVideo: boolean;
  isOwnerOrAdmin: boolean;
}) {
  const utils = trpc.useUtils();
  const { data: notes, isLoading } = trpc.ai.getLessonNotes.useQuery({ lessonId });
  const generateMutation = trpc.ai.generateNotes.useMutation({
    onSuccess: (data) => setJobId(data.jobId),
    onError: (error) => toast.error(error.message),
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: job } = trpc.ai.getNotesJobStatus.useQuery(
    { jobId: jobId ?? "" },
    {
      enabled: !!jobId,
      refetchInterval: (query) => ["pending", "processing"].includes(query.state.data?.status ?? "") ? 3000 : false,
    }
  );

  useEffect(() => {
    if (job?.status === "completed") {
      setJobId(null);
      utils.ai.getLessonNotes.invalidate({ lessonId });
    }
    if (job?.status === "failed") {
      toast.error(job.error || "Note generation failed.");
      setJobId(null);
    }
  }, [job, lessonId, utils]);

  if (isLoading) return <div className="mt-8 h-48 animate-pulse rounded-xl bg-[var(--color-border)]" />;
  const isGenerating = generateMutation.isPending || !!jobId;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Study Notes</h2>
          {!notes && isOwnerOrAdmin && <p className="text-sm text-[var(--color-text-secondary)]">Turn the lesson video into a quick handwritten-style recap.</p>}
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={() => hasVideo ? generateMutation.mutate({ lessonId }) : toast.error("Upload a video for this lesson before generating notes.")}
            disabled={isGenerating}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            <FontAwesomeIcon icon={isGenerating ? faSpinner : faWandMagicSparkles} className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Generating..." : notes ? "Regenerate" : "Generate Notes"}
          </button>
        )}
      </div>

      {!notes && !isGenerating && <p className="rounded-xl border border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">Notes for this lesson have not been generated yet.</p>}
      {notes && (
        <div className="relative overflow-hidden rounded-xl border border-amber-100 bg-[#fffdf7] p-5 sm:p-7" style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, #e8e2d0 32px)", backgroundPosition: "0 8px" }}>
          <div className="absolute bottom-0 left-8 top-0 w-px bg-rose-200/70" />
          <div className={`${caveat.className} pl-6 text-xl leading-relaxed text-slate-700`}>
            <h3 className="text-3xl font-bold leading-tight text-slate-800">{notes.title}</h3>
            <p className="mt-3">{notes.summary}</p>
            <h4 className="mt-5 text-2xl font-bold text-slate-800">Key ideas</h4>
            <ul className="mt-2 space-y-2">
              {notes.keyConcepts.map((concept, index) => <li key={`${concept.term}-${index}`}><span className="font-bold text-slate-900" style={{ background: "linear-gradient(to bottom, transparent 55%, #fde68a 55%)" }}>{concept.term}</span>{" - "}{concept.explanation}</li>)}
            </ul>
            <div className="mt-5 rounded-md border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-3 text-emerald-900">
              <p className="flex items-center gap-2 font-bold"><FontAwesomeIcon icon={faLightbulb} className="h-4 w-4" />Remember this</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">{notes.takeaways.map((point, index) => <li key={`${point}-${index}`}>{point}</li>)}</ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}