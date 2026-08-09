"use client";

import { useEffect, useRef } from "react";
import { updateProgress } from "@/app/actions/progress";

const TICK_SECONDS = 15;

interface ProgressTrackerProps {
  moduleId: string;
  initialWatchPositionSeconds: number;
}

// v1 completion heuristic: counts active (visible-tab) time, not real video
// playback — Dubb exposes no postMessage/JS event API to detect actual
// play/pause/completion (see build-plan-lms.md). Ticks every 15s rather than
// continuously to keep the server-action traffic light; a page closed
// mid-module loses at most one tick's worth of progress.
export function ProgressTracker({ moduleId, initialWatchPositionSeconds }: ProgressTrackerProps) {
  const elapsedSecondsRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;

      elapsedSecondsRef.current += TICK_SECONDS;
      const nextPosition = initialWatchPositionSeconds + elapsedSecondsRef.current;
      updateProgress(moduleId, nextPosition).catch(() => {
        // Best-effort — a dropped tick just means slightly stale progress,
        // not a broken page.
      });
    }, TICK_SECONDS * 1000);

    return () => clearInterval(interval);
  }, [moduleId, initialWatchPositionSeconds]);

  return null;
}
