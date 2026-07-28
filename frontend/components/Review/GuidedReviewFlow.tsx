"use client";

import { useMemo, useState } from "react";

import CriticalPositionList from "@/components/Review/CriticalPositionList";
import GuidedReviewSession from "@/components/Review/GuidedReviewSession";
import GuidedReviewSummary from "@/components/Review/GuidedReviewSummary";
import {
  buildSessionResult,
  saveReviewSession,
} from "@/lib/review/guidedReviewStorage";
import type {
  CriticalPosition,
  GuidedReviewSessionResult,
  PositionReviewResult,
} from "@/types/guidedReview";

type GuidedReviewFlowProps = {
  positions: CriticalPosition[];
  onClose?: () => void;
};

type Screen =
  | "list"
  | "session"
  | "summary";

export default function GuidedReviewFlow({
  positions,
  onClose,
}: GuidedReviewFlowProps) {
  const [screen, setScreen] =
    useState<Screen>("list");
  const [activePositions, setActivePositions] =
    useState(positions);
  const [initialIndex, setInitialIndex] =
    useState(0);
  const [startedAt, setStartedAt] =
    useState<string | null>(null);
  const [summary, setSummary] =
    useState<GuidedReviewSessionResult | null>(
      null,
    );

  const sortedPositions = useMemo(
    () =>
      [...positions].sort(
        (a, b) =>
          b.evaluationLossCp -
          a.evaluationLossCp,
      ),
    [positions],
  );

  function startSession(
    startIndex = 0,
    selectedPositions =
      sortedPositions,
  ): void {
    setActivePositions(
      selectedPositions,
    );
    setInitialIndex(startIndex);
    setStartedAt(
      new Date().toISOString(),
    );
    setSummary(null);
    setScreen("session");
  }

  function completeSession(
    results: PositionReviewResult[],
  ): void {
    const result =
      buildSessionResult({
        startedAt:
          startedAt ??
          new Date().toISOString(),
        completedAt:
          new Date().toISOString(),
        positions: results,
      });

    saveReviewSession(result);
    setSummary(result);
    setScreen("summary");
  }

  if (screen === "session") {
    return (
      <GuidedReviewSession
        key={`${activePositions
          .map((item) => item.id)
          .join("-")}-${initialIndex}`}
        positions={activePositions}
        initialIndex={initialIndex}
        onExit={() =>
          setScreen("list")
        }
        onComplete={completeSession}
      />
    );
  }

  if (
    screen === "summary" &&
    summary
  ) {
    return (
      <GuidedReviewSummary
        positions={activePositions}
        result={summary}
        onRestartMistakes={(
          retryPositions,
        ) =>
          startSession(
            0,
            retryPositions,
          )
        }
        onClose={() => {
          setScreen("list");
          onClose?.();
        }}
      />
    );
  }

  return (
    <CriticalPositionList
      positions={sortedPositions}
      onStart={(startIndex) =>
        startSession(startIndex)
      }
    />
  );
}
