"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faSpinner } from "@fortawesome/free-solid-svg-icons";

interface VideoPlayerProps {
  lessonId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  onProgress?: (percent: number) => void;
  onComplete?: () => void;
}

export function VideoPlayer({ 
  lessonId, 
  videoUrl, 
  thumbnailUrl, 
  onProgress, 
  onComplete 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const isVideoCompletedRef = useRef(false);

  const updateProgressMutation = trpc.course.updateProgress.useMutation();
  const markVideoCompleteMutation = trpc.course.markVideoComplete.useMutation();

  const saveProgress = (percent: number) => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(() => {
      updateProgressMutation.mutate({
        lessonId,
        progressPercent: Math.round(Math.min(percent, 100)),
      });
    }, 1000);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const percent = (video.currentTime / video.duration) * 100;
    const rounded = Math.min(percent, 100);
    setProgress(rounded);
    
    onProgress?.(rounded);

    // Mark video as completed when reaches 80%
    if (rounded >= 80 && !isVideoCompletedRef.current) {
      isVideoCompletedRef.current = true;
      markVideoCompleteMutation.mutate({ lessonId });
      onComplete?.();
    }

    // Save every 5 seconds
    if (Math.floor(video.currentTime) % 5 === 0) {
      saveProgress(rounded);
    }
  };

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    setIsLoading(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(100);
    onProgress?.(100);
    if (!isVideoCompletedRef.current) {
      isVideoCompletedRef.current = true;
      markVideoCompleteMutation.mutate({ lessonId });
      onComplete?.();
    }
    updateProgressMutation.mutate({
      lessonId,
      progressPercent: 100,
    });
  };

  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl || undefined}
        className="w-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onClick={handlePlay}
      />

      <button
        onClick={handlePlay}
        className="absolute bottom-4 left-4 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70"
      >
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className="h-5 w-5" />
      </button>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="absolute bottom-4 right-4 text-xs text-white/80">
        {Math.round(progress)}%
      </div>
    </div>
  );
}