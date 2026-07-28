"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { LearningProfile } from "@/lib/learning/types";
import type { MoveReviewResponse } from "@/services/api/ApiService";

export function useLearningProfile(input: {
  moves: string[];
  moveReviews: Record<number, MoveReviewResponse>;
  readyToRecord: boolean;
  onRecorded?: () => void;
}) {
  const { moves, moveReviews, readyToRecord, onRecorded } = input;
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const recordedFingerprintRef = useRef("");
  const reviewedMoveCount = Object.keys(moveReviews).length;
  const movesFingerprint = useMemo(() => moves.join(" "), [moves]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const response = await fetch("/api/learning/profile", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { profile: LearningProfile };
      setProfile(payload.profile);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (
      !readyToRecord ||
      moves.length === 0 ||
      reviewedMoveCount !== moves.length ||
      recordedFingerprintRef.current === movesFingerprint
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
      recordedFingerprintRef.current = movesFingerprint;
      const reviews = Object.entries(moveReviews)
        .map(([index, review]) => ({
          moveIndex: Number(index),
          classification: review.classification,
          evaluationLoss: review.evaluation_loss,
          isCapture: review.played_move_is_capture,
          bestVariation: review.best_variation,
        }))
        .sort((first, second) => first.moveIndex - second.moveIndex);
      const response = await fetch("/api/learning/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moves, reviews }),
      });
      if (!response.ok) {
        recordedFingerprintRef.current = "";
        return;
      }
      const payload = (await response.json()) as { profile: LearningProfile };
      setProfile(payload.profile);
      onRecorded?.();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    moveReviews,
    moves,
    onRecorded,
    readyToRecord,
    movesFingerprint,
    reviewedMoveCount,
  ]);

  return profile;
}
