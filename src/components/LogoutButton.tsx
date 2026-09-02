"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/react";

export function LogoutButton() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authClient.signOut();
      await utils.auth.getSession.invalidate();
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-slate-600 hover:text-red-600 transition-colors"
      disabled={loading}
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
