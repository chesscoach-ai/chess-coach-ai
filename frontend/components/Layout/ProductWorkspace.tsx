"use client";

import { useState } from "react";

import OnlineGameHistory, {
  type OpenedGameReview,
} from "@/components/Analysis/OnlineGameHistory";
import BackendStatus from "@/components/Layout/BackendStatus";
import GameWorkspace from "@/components/Layout/GameWorkspace";
import MultiplayerWorkspace from "@/components/Multiplayer/MultiplayerWorkspace";
import AnalysisPaywall from "@/components/Billing/AnalysisPaywall";
import type { AnalysisEntitlement } from "@/lib/billing/types";
import { setActiveGameReviewId } from "@/services/api/ApiService";
import ActivityStreak from "@/components/Statistics/ActivityStreak";

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

  return (
    <div className="w-full">
      <ActivityStreak
        currentUser={currentUser}
      />

      <ModeSelector mode={mode} onChange={setMode} />

      <div className="mt-4 flex justify-center">
        <BackendStatus disabled={mode === "multiplayer"} />
      </div>

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
          onOpenGameReview={
            openReviewFromGame
          }
        />
      )}
    </div>
  );
}

function ModeSelector({
  mode,
  onChange,
}: {
  mode: ProductMode;
  onChange: (mode: ProductMode) => void;
}) {
  return (
    <section
      aria-label="Choix du mode"
      className="mx-auto grid w-full max-w-2xl grid-cols-2 rounded-2xl border border-gray-800 bg-gray-900 p-1.5 shadow-xl"
    >
      <ModeButton
        active={mode === "analysis"}
        title="Mode analyse"
        description="Joue, importe et apprends avec le coach."
        onClick={() => onChange("analysis")}
      />
      <ModeButton
        active={mode === "multiplayer"}
        title="Mode multijoueur"
        description="Affronte un joueur sans aucune assistance."
        onClick={() => onChange("multiplayer")}
      />
    </section>
  );
}

function ModeButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "rounded-xl px-3 py-3 text-left transition sm:px-5",
        active
          ? "bg-blue-600 text-white shadow-lg"
          : "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
      ].join(" ")}
    >
      <span className="block text-sm font-bold sm:text-base">{title}</span>
      <span
        className={[
          "mt-1 hidden text-xs leading-5 sm:block",
          active ? "text-blue-100" : "text-gray-500",
        ].join(" ")}
      >
        {description}
      </span>
    </button>
  );
}
