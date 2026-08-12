"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import OnlineGameHistory, {
  type OpenedGameReview,
} from "@/components/Analysis/OnlineGameHistory";
import GameWorkspace from "@/components/Layout/GameWorkspace";
import WorkspaceMenu from "@/components/Layout/WorkspaceMenu";
import MultiplayerWorkspace, {
  type MultiplayerKind,
} from "@/components/Multiplayer/MultiplayerWorkspace";
import AnalysisPaywall from "@/components/Billing/AnalysisPaywall";
import ExerciseLibraryPage from "@/components/Exercises/ExerciseLibraryPage";
import ExerciseTrainer from "@/components/Exercises/ExerciseTrainer";
import ActivityStreak from "@/components/Statistics/ActivityStreak";
import PlayerStatistics from "@/components/Statistics/PlayerStatistics";
import type { AnalysisEntitlement } from "@/lib/billing/types";
import {
  ApiService,
  setActiveGameReviewId,
} from "@/services/api/ApiService";

export type ProductMode =
  | "multiplayer"
  | "analysis"
  | "exercises"
  | "progression";

export type CurrentUser = {
  name: string;
  email: string;
};

export default function ProductWorkspace({
  currentUser,
  analysisEntitlement,
}: {
  currentUser: CurrentUser | null;
  analysisEntitlement: AnalysisEntitlement;
}) {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<ProductMode>("multiplayer");
  const [exerciseView, setExerciseView] =
    useState<"library" | "training">("library");
  const [openedReview, setOpenedReview] =
    useState<OpenedGameReview | null>(
      null,
    );
  const [historyRefreshKey, setHistoryRefreshKey] =
    useState(0);
  const [reviewError, setReviewError] =
    useState("");
  const [requestedMultiplayerKind, setRequestedMultiplayerKind] =
    useState<MultiplayerKind>("launcher");

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    const requestedKind = searchParams.get("kind");
    const timer = window.setTimeout(() => {
      if (
        requestedMode === "multiplayer" ||
        requestedMode === "analysis" ||
        requestedMode === "exercises" ||
        requestedMode === "progression"
      ) {
        setMode(requestedMode);
      }
      if (
        requestedKind === "online" ||
        requestedKind === "friend" ||
        requestedKind === "ai" ||
        requestedKind === "local" ||
        requestedKind === "community"
      ) {
        setRequestedMultiplayerKind(requestedKind);
        setMode("multiplayer");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    if (mode !== "analysis" || !analysisEntitlement.hasAccess) return;

    // Vérifie la readiness sans déclencher une analyse coûteuse.
    void ApiService.getHealth().catch(() => {
      // AnalysisPanel garde son bouton de relance et affiche l'erreur utile.
    });
  }, [analysisEntitlement.hasAccess, mode]);

  function handleReviewReady(
    review: OpenedGameReview,
  ): void {
    setActiveGameReviewId(
      review.game.id,
    );
    setOpenedReview(review);
    setMode("analysis");
    setReviewError("");
  }

  async function openReviewFromGame(
    gameId: string,
  ): Promise<void> {
    try {
      const response = await fetch(
        `/api/multiplayer/games/${gameId}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
        },
      );
      const payload =
        (await response.json()) as
          | OpenedGameReview
          | {
              message?: string;
            };
      if (
        !response.ok ||
        !("game" in payload) ||
        !("allowance" in payload)
      ) {
        throw new Error(
          "message" in payload &&
          payload.message
            ? payload.message
            : "Ce bilan ne peut pas être ouvert.",
        );
      }
      handleReviewReady(payload);
    } catch (error) {
      setMode("analysis");
      setReviewError(
        error instanceof Error
          ? error.message
          : "Ce bilan ne peut pas être ouvert.",
      );
    }
  }

  function scrollAfterRender(targetId: string): void {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }

  function selectMobileMode(nextMode: ProductMode): void {
    if (nextMode === "multiplayer") {
      setRequestedMultiplayerKind("launcher");
    }
    setMode(nextMode);
    scrollAfterRender(
      nextMode === "multiplayer"
        ? "multiplayer-workspace"
        : nextMode === "analysis"
          ? "game-board"
          : nextMode === "exercises"
            ? "exercise-workspace"
            : "progression-workspace",
    );
  }

  function openExercises(): void {
    setMode("exercises");
    scrollAfterRender("exercise-workspace");
  }

  function openStatistics(): void {
    setMode("progression");
    scrollAfterRender("progression-workspace");
  }

  function openCommunity(): void {
    setRequestedMultiplayerKind("community");
    setMode("multiplayer");
    scrollAfterRender("multiplayer-workspace");
  }

  function openHistory(): void {
    setMode("analysis");
    scrollAfterRender("game-history");
  }

  return (
    <div className="w-full">
      <WorkspaceMenu
        mode={mode}
        onPlay={() => selectMobileMode("multiplayer")}
        onCoach={() => selectMobileMode("analysis")}
        onExercises={openExercises}
        onCommunity={openCommunity}
        onStatistics={openStatistics}
        onHistory={openHistory}
      />

      {mode === "analysis" ? (
        <div className="space-y-6">
          {reviewError && (
            <p
              role="alert"
              className="rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-200"
            >
              {reviewError}
            </p>
          )}

          {analysisEntitlement.hasAccess ||
          openedReview ? (
            <GameWorkspace
              key={
                openedReview?.game.id ??
                "free-analysis"
              }
              initialPgn={
                openedReview?.game.pgn
              }
              reviewGameId={
                openedReview?.game.id
              }
              currentUser={currentUser}
              onReviewSaved={() => {
                setHistoryRefreshKey(
                  (current) =>
                    current + 1,
                );
              }}
            />
          ) : (
            <AnalysisPaywall
              currentUser={currentUser}
              entitlement={
                analysisEntitlement
              }
            />
          )}

          <OnlineGameHistory
            currentUser={currentUser}
            refreshKey={
              historyRefreshKey
            }
            activeGameId={
              openedReview?.game.id
            }
            onOpenReview={
              handleReviewReady
            }
          />
        </div>
      ) : mode === "multiplayer" ? (
        <MultiplayerWorkspace
          currentUser={currentUser}
          requestedKind={requestedMultiplayerKind}
          onKindChange={setRequestedMultiplayerKind}
          onOpenGameReview={
            openReviewFromGame
          }
        />
      ) : mode === "exercises" ? (
        <div id="exercise-workspace" className="scroll-mt-20">
          {!analysisEntitlement.hasAccess ? (
            <AnalysisPaywall
              currentUser={currentUser}
              entitlement={analysisEntitlement}
              feature="exercises"
            />
          ) : exerciseView === "library" ? (
            <ExerciseLibraryPage
              embedded
              onExit={() => selectMobileMode("multiplayer")}
              onTrainingStart={() => setExerciseView("training")}
            />
          ) : (
            <ExerciseTrainer
              embedded
              onExit={() => setExerciseView("library")}
            />
          )}
        </div>
      ) : (
        <div
          id="progression-workspace"
          className="scroll-mt-20 space-y-4 sm:space-y-6"
        >
          <ActivityStreak currentUser={currentUser} />
          <PlayerStatistics currentUser={currentUser} variant="analysis" />
        </div>
      )}

      <MobileDock
        mode={mode}
        onModeChange={selectMobileMode}
        onExercisesOpen={openExercises}
        onStatisticsOpen={openStatistics}
      />
    </div>
  );
}

function MobileDock({
  mode,
  onModeChange,
  onExercisesOpen,
  onStatisticsOpen,
}: {
  mode: ProductMode;
  onModeChange: (mode: ProductMode) => void;
  onExercisesOpen: () => void;
  onStatisticsOpen: () => void;
}) {
  const itemClass =
    "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold transition active:scale-95";

  return (
    <nav
      aria-label="Navigation mobile principale"
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-gray-800 bg-gray-950/95 px-2 pt-2 shadow-[0_-12px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-md gap-1">
        <button
          type="button"
          aria-current={mode === "multiplayer" ? "page" : undefined}
          onClick={() => onModeChange("multiplayer")}
          className={`${itemClass} ${
            mode === "multiplayer"
              ? "bg-blue-600/20 text-blue-300"
              : "text-gray-500"
          }`}
        >
          <DockIcon path="M8 5v14l11-7L8 5Z" />
          Jouer
        </button>
        <button
          type="button"
          aria-current={mode === "analysis" ? "page" : undefined}
          onClick={() => onModeChange("analysis")}
          className={`${itemClass} ${
            mode === "analysis"
              ? "bg-blue-600/20 text-blue-300"
              : "text-gray-500"
          }`}
        >
          <DockIcon path="M9 18h6m-5 3h4m3-12a5 5 0 1 0-10 0c0 2 1 3.5 2.5 4.5V15h5v-1.5C16 12 17 11 17 9Z" />
          Nox
        </button>
        <button
          type="button"
          aria-current={mode === "exercises" ? "page" : undefined}
          onClick={onExercisesOpen}
          className={`${itemClass} ${
            mode === "exercises"
              ? "bg-blue-600/20 text-blue-300"
              : "text-gray-500"
          }`}
        >
          <DockIcon path="M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 0v18M4 7l8 4 8-4" />
          Exercices
        </button>
        <button
          type="button"
          aria-current={mode === "progression" ? "page" : undefined}
          onClick={onStatisticsOpen}
          className={`${itemClass} ${
            mode === "progression"
              ? "bg-blue-600/20 text-blue-300"
              : "text-gray-500"
          }`}
        >
          <DockIcon path="M5 20V10m7 10V4m7 16v-7" />
          Progrès
        </button>
      </div>
    </nav>
  );
}

function DockIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}
