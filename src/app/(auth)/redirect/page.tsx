"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/react";
import { useSession } from "@/lib/auth-client";

export default function AuthRedirectPage() {
  const router = useRouter();
  const { data: clientSession } = useSession();

  const { data: serverSession, isLoading: serverLoading } = trpc.auth.getSession.useQuery(undefined, {
    enabled: !!clientSession,
    retry: false,
  });

  useEffect(() => {
    if (!clientSession) return;
    if (serverLoading) return;
    const role = serverSession?.user?.globalRole;
    if (role === "admin" || role === "super_admin") {
      router.replace("/admin");
    } else {
      router.replace("/feed");
    }
  }, [clientSession, serverLoading, serverSession, router]);

  return null;
}
