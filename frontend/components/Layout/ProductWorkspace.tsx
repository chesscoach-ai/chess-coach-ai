"use client";

import Link from "next/link";
import { useState } from "react";

import OnlineGameHistory, {
  type OpenedGameReview,
} from "@/components/Analysis/OnlineGameHistory";
import GameWorkspace from "@/components/Layout/GameWorkspace";
import WorkspaceMenu from "@/components/Layout/WorkspaceMenu";
import MultiplayerWorkspace, {
  type MultiplayerKind,
} from "@/components/Multiplayer/MultiplayerWorkspace";
import AnalysisPaywall from "@/components/Billing/AnalysisPaywall";
import DailyJourneyHub from "@/components/Progression/DailyJourneyHub";
import type { AnalysisEntitlement } from "@/lib/billing/types";
import { setActiveGameReviewId } from "@/services/api/ApiService";

export type ProductMode = "analysis" | "multiplayer";

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
  const [mode, setMode] = useState<ProductMode>("analysis");
  const [openedReview, setOpenedReview] =
    useState<OpenedGameReview | null>(
      null,
    );
  const [historyRefreshKey, setHistoryRefreshKey] =
    useState(0);
  const [reviewError, setReviewError] =
    useState("");
  const [requestedMultiplayerKind, setRequestedMultiplayerKind] =
    useState<MultiplayerKind>("online");
  const [isGameFocused, setIsGameFocused] =
    useState(false);

  function handleReviewReady(
    review: OpenedGameReview,
  ): void {
    setActiveGameReviewId(
      review.game.id,
    );
    setOpenedReview(review);
    setIsGameFocused(false);
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
      setRequestedMultiplayerKind("online");
    } else {
      setIsGameFocused(false);
    }
    setMode(nextMode);
    scrollAfterRender("game-board");
  }

  function openStatistics(): void {
    scrollAfterRender("statistics");
  }

  function openCommunity(): void {
    setRequestedMultiplayerKind("community");
    setIsGameFocused(false);
    setMode("multiplayer");
    scrollAfterRender("multiplayer-workspace");
  }

  function openHistory(): void {
    setIsGameFocused(false);
    setMode("analysis");
    scrollAfterRender("game-history");
  }

  return (
    <div className="w-full">
      <WorkspaceMenu
        mode={mode}
        onPlay={() => selectMobileMode("multiplayer")}
        onCoach={() => selectMobileMode("analysis")}
        onCommunity={openCommunity}
        onStatistics={openStatistics}
        onHistory={openHistory}
      />

      {!isGameFocused && (
        <DailyJourneyHub
          currentUser={currentUser}
          mode={mode}
          onPlay={() =>
            selectMobileMode("multiplayer")
          }
          onCoach={() =>
            selectMobileMode("analysis")
          }
        />
      )}

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
      ) : (
        <MultiplayerWorkspace
          currentUser={currentUser}
          requestedKind={requestedMultiplayerKind}
          onKindChange={setRequestedMultiplayerKind}
          onGameFocusChange={setIsGameFocused}
          onOpenGameReview={
            openReviewFromGame
          }
        />
      )}

      <MobileDock
        mode={mode}
        onModeChange={selectMobileMode}
        onStatisticsOpen={openStatistics}
      />
    </div>
  );
}

function MobileDock({
  mode,
  onModeChange,
  onStatisticsOpen,
}: {
  mode: ProductMode;
  onModeChange: (mode: ProductMode) => void;
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
          Coach
        </button>
        <Link
          href="/exercises"
          className={`${itemClass} text-gray-500`}
        >
          <DockIcon path="M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 0v18M4 7l8 4 8-4" />
          Exercices
        </Link>
        <button
          type="button"
          onClick={onStatisticsOpen}
          className={`${itemClass} text-gray-500`}
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
