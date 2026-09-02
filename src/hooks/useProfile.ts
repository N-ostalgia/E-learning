"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/react";
import type { UpdateProfileInput } from "@/server/modules/profile/profile.types";

export function useProfile() {
  const utils = trpc.useUtils();
  const router = useRouter();

  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: (updated) => {
      utils.profile.getByUsername.invalidate({ username: updated.username });
      utils.profile.getById.invalidate({ userId: updated.id });
      utils.auth.getSession.invalidate();
      toast.success("Profile updated successfully!");
      router.push(`/profile/${updated.username}`);
    },
    onError: (err) => {
      const errorMessage = err.message || "Failed to update profile.";
      toast.error(errorMessage);
    },
  });

  const updateProfile = (
    data: UpdateProfileInput,
    options?: { onSuccess?: () => void; onError?: (err: Error) => void }
  ) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        options?.onSuccess?.();
      },
      onError: (err) => {
        // Convert to Error object if needed
        const error = err instanceof Error ? err : new Error(err.message || "Unknown error");
        options?.onError?.(error);
      },
    });
  };

  return {
    updateProfile,
    isUpdating: updateMutation.isPending,
  };
}