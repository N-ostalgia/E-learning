"use client";

import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";

export function useReport() {
  const createMutation = trpc.feed.createReport.useMutation({
    onSuccess: () => {
      toast.success("Report submitted. We'll review it shortly.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit report.");
    },
  });

  return {
    createReport: createMutation.mutate,
    isReporting: createMutation.isPending,
  };
}

