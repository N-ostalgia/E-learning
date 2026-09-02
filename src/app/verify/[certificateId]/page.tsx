// src/app/verify/[certificateId]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { NexusLogo } from "@/components/NexusLogo";

interface VerificationData {
  valid: boolean;
  verified: boolean;
  certificate: {
    id: string;
    recipientName: string;
    courseTitle: string;
    completedAt: string | null;
    issuedBy: string;
  };
}

export default function VerifyCertificatePage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyCertificate = async () => {
      try {
        const response = await fetch(`/api/verify/${certificateId}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Failed to verify certificate");
        } else {
          setData(result);
        }
      } catch (err) {
        setError("Failed to verify certificate. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (certificateId) {
      verifyCertificate();
    }
  }, [certificateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="h-12 w-12 animate-spin text-emerald-500" />
          <p className="mt-4 text-[var(--color-text-secondary)]">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <FontAwesomeIcon icon={faTimesCircle} className="h-16 w-16 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)]">Verification Failed</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">{error}</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-[var(--color-accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const isVerified = data.verified && data.valid;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-3">
            <NexusLogo className="h-10 w-10" />
            <span className="font-display text-xl font-bold text-[var(--color-text-primary)]">Nexus</span>
          </div>
          <span className="text-sm text-[var(--color-text-secondary)]">Certificate Verification</span>
        </div>

        {/* Status */}
        <div className="mt-6 text-center">
          <div className="flex justify-center">
            {isVerified ? (
              <FontAwesomeIcon icon={faCheckCircle} className="h-16 w-16 text-emerald-500" />
            ) : (
              <FontAwesomeIcon icon={faTimesCircle} className="h-16 w-16 text-red-500" />
            )}
          </div>
          <h1 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)]">
            {isVerified ? "✓ Certificate Verified" : "✗ Certificate Not Verified"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Certificate ID: {data.certificate.id}
          </p>
        </div>

        {/* Details */}
        {isVerified && (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
            <div className="grid gap-4 text-sm">
              <div>
                <span className="text-[var(--color-text-secondary)]">Recipient</span>
                <p className="font-medium text-[var(--color-text-primary)]">{data.certificate.recipientName}</p>
              </div>
              <div>
                <span className="text-[var(--color-text-secondary)]">Course</span>
                <p className="font-medium text-[var(--color-text-primary)]">{data.certificate.courseTitle}</p>
              </div>
              <div>
                <span className="text-[var(--color-text-secondary)]">Issued By</span>
                <p className="font-medium text-[var(--color-text-primary)]">{data.certificate.issuedBy}</p>
              </div>
              {data.certificate.completedAt && (
                <div>
                  <span className="text-[var(--color-text-secondary)]">Date Completed</span>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {new Date(data.certificate.completedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!isVerified && data.valid && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
            <p className="text-sm text-red-400">
              This certificate was found but has not been verified. The recipient may not have completed the course.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            Go Home
          </Link>
        </div>

        <div className="mt-6 border-t border-[var(--color-border)] pt-4 text-center text-xs text-[var(--color-text-secondary)]">
          This certificate was issued by Nexus Learning Platform.
          {isVerified && " ✓ Authentic and verified."}
        </div>
      </div>
    </div>
  );
}