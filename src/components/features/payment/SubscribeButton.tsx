// src/components/features/payment/SubscribeButton.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faArrowRight } from "@fortawesome/free-solid-svg-icons";

interface SubscribeButtonProps {
  userId?: string;
}

export default function SubscribeButton({ userId }: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!userId) {
      toast.error("You must be logged in to subscribe");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/create-platform-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to create checkout session");
      }
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading || !userId}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <>
          <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          Subscribe to Pro
          <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
        </>
      )}
    </button>
  );
}