// src/components/features/upload/FileUploader.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudUpload,
  faSpinner,
  faCheck,
  faTimes,
  faFile,
  faImage,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";

interface FileUploaderProps {
  onUploadSuccess?: (url: string, key: string) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  uploadType: "image" | "video" | "document";
  folder?: string;
  buttonText?: string;
  className?: string;
}

export function FileUploader({
  onUploadSuccess,
  onUploadError,
  accept = "image/*",
  maxSize = 10,
  uploadType,
  folder = "",
  buttonText = "Upload File",
  className = "",
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<{ url: string; key: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      setProgress(0);
      setIsUploading(true);

      try {
        // Validate file type
        const validTypes: Record<string, string[]> = {
          image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
          video: ["video/mp4", "video/webm", "video/ogg"],
          document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        };

        const allowedTypes = validTypes[uploadType] || [];
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Please upload a valid ${uploadType} file`);
        }

        // Validate file size
        const maxBytes = maxSize * 1024 * 1024;
        if (file.size > maxBytes) {
          throw new Error(`File too large. Max ${maxSize}MB`);
        }

        // Get presigned URL
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
            kind: uploadType,
            folder,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get upload URL");
        }

        const { uploadUrl, key, publicUrl } = await response.json();

        // Upload file directly to R2
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);

        await new Promise<void>((resolve, reject) => {
          xhr.upload.onprogress = (event) => {
            if (event.total > 0) {
              setProgress(Math.round((event.loaded / event.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.send(file);
        });

        // Use the publicUrl from the response, NOT the fallback
        const url = publicUrl;

        if (!url) {
          throw new Error("Public URL not available. Check R2_PUBLIC_URL configuration.");
        }

        setUploaded({ url, key });
        onUploadSuccess?.(url, key);
      } catch (err: any) {
        const errorMessage = err.message || "Upload failed";
        setError(errorMessage);
        onUploadError?.(errorMessage);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [maxSize, uploadType, folder, onUploadSuccess, onUploadError]
  );

  const getIcon = () => {
    switch (uploadType) {
      case "image":
        return faImage;
      case "video":
        return faVideo;
      default:
        return faFile;
    }
  };

  return (
    <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 ${className}`}>
      <div className="flex flex-col items-center gap-4">
        {/* Upload area */}
        <div
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--color-border)] p-8 transition-colors hover:border-[var(--color-accent)]"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add("border-[var(--color-accent)]");
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-[var(--color-accent)]");
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-[var(--color-accent)]");
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              handleFileSelect(files[0]);
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileSelect(file);
              }
            }}
            disabled={isUploading}
          />

          {isUploading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="h-12 w-12 animate-spin text-[var(--color-accent)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">Uploading... {progress}%</p>
              <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : uploaded ? (
            <>
              <FontAwesomeIcon icon={faCheck} className="h-12 w-12 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-500">Upload complete!</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUploaded(null);
                  setProgress(0);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
              >
                Upload another file
              </button>
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={getIcon()} className="h-12 w-12 text-[var(--color-text-secondary)]" />
              <p className="text-center text-sm text-[var(--color-text-secondary)]">
                Drag & drop your {uploadType} here, or click to browse
              </p>
              <p className="text-center text-xs text-[var(--color-text-secondary)]">
                Max {maxSize}MB
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="flex w-full items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
            {error}
          </div>
        )}

        {uploaded && (
          <div className="w-full rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
            <p className="break-all">File uploaded successfully!</p>
          </div>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faCloudUpload} className="h-4 w-4" />
          {isUploading ? "Uploading..." : buttonText}
        </button>
      </div>
    </div>
  );
}