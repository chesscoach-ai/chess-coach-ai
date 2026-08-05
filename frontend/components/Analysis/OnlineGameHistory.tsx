"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import type { OnlineGameHistoryItem } from "@/lib/multiplayer/types";

export type ReviewAllowance = {
  freeLimit: number;
  freeUsed: number;
  freeRemaining: number;
  unlockedGameIds: string[];
  hasUnlimitedAccess: boolean;
};

export type OpenedGameReview = {
  game: OnlineGameHistoryItem;
  allowance: ReviewAllowance;
};

export default function OnlineGameHistory({
  currentUser,
  refreshKey,
  activeGameId,
  onOpenReview,
}: {
  currentUser: CurrentUser | null;
  refreshKey: number;
  activeGameId?: string | null;
  onOpenReview: (
    review: OpenedGameReview,
  ) => void;
}) {
  const [games, setGames] =
    useState<OnlineGameHistoryItem[]>(
      [],
    );
  const [allowance, setAllowance] =
    useState<ReviewAllowance | null>(
      null,
    );
  const [loadingId, setLoadingId] =
    useState<string | null>(null);
  const [isLoading, setIsLoading] =
    useState(Boolean(currentUser));
  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const controller =
      new AbortController();

    void fetch(
      "/api/multiplayer/history",
      {
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const payload =
          (await response.json()) as {
            games?: OnlineGameHistoryItem[];
            allowance?: ReviewAllowance;
            message?: string;
          };
        if (
          !response.ok ||
          !payload.games ||
          !payload.allowance
        ) {
          throw new Error(
            payload.message ??
              "Impossible de charger l’historique.",
          );
        }
        setGames(payload.games);
        setAllowance(
          payload.allowance,
        );
        setError("");
      })
      .catch((requestError) => {
        if (
          requestError instanceof
            DOMException &&
          requestError.name ===
            "AbortError"
        ) {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Impossible de charger l’historique.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [currentUser, refreshKey]);

  async function openReview(
    gameId: string,
  ): Promise<void> {
    setLoadingId(gameId);
    setError("");

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

      setAllowance(payload.allowance);
      setGames((current) =>
        current.map((game) =>
          game.id === gameId
            ? {
                ...game,
                reviewUnlocked: true,
              }
            : game,
        ),
      );
      onOpenReview(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ce bilan ne peut pas être ouvert.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <details
      id="game-history"
      className="group scroll-mt-24 overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70 shadow-xl"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-4 sm:px-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-400">
            Tes parties en ligne
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            Historique et bilans
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Reprends une partie terminée et analyse chaque décision avec le coach.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {allowance && (
            <div className="rounded-xl border border-blue-800 bg-blue-950/30 px-3 py-2 text-right">
              <p className="text-xs font-bold text-blue-200">
                {allowance.hasUnlimitedAccess
                  ? "Bilans illimités"
                  : `${allowance.freeRemaining} gratuit${allowance.freeRemaining > 1 ? "s" : ""}`}
              </p>
            </div>
          )}
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-blue-300 transition group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>

      <div className="border-t border-gray-800">

      {!currentUser ? (
        <div className="p-6 text-center">
          <p className="text-gray-400">
            Connecte-toi pour retrouver tes parties en ligne.
          </p>
          <Link
            href="/auth"
            className="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500"
          >
            Se connecter
          </Link>
        </div>
      ) : isLoading ? (
        <p className="p-6 text-sm text-gray-400">
          Chargement de l’historique…
        </p>
      ) : games.length === 0 ? (
        <div className="p-6 text-center">
          <p className="font-semibold text-gray-200">
            Aucune partie terminée
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Termine une partie en ligne : pour le moment, aucun roi n’a encore
            été suffisamment malmené pour produire un bilan.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {games.map((game) => (
            <HistoryRow
              key={game.id}
              game={game}
              active={
                activeGameId === game.id
              }
              loading={
                loadingId === game.id
              }
              onOpen={() =>
                void openReview(game.id)
              }
            />
          ))}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="m-5 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      </div>
    </details>
  );
}

function HistoryRow({
  game,
  active,
  loading,
  onOpen,
}: {
  game: OnlineGameHistoryItem;
  active: boolean;
  loading: boolean;
  onOpen: () => void;
}) {
  const formattedDate =
    new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(game.endedAt));

  return (
    <article
      className={[
        "grid gap-4 p-5 transition lg:grid-cols-[minmax(260px,1.4fr)_150px_190px_auto] lg:items-center",
        active
          ? "bg-blue-950/25"
          : "hover:bg-gray-900",
      ].join(" ")}
    >
      <div>
        <p className="font-bold text-white">
          {game.white.name}{" "}
          <span className="text-gray-600">
            contre
          </span>{" "}
          {game.black.name}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {formattedDate} ·{" "}
          {game.termination}
        </p>
      </div>

      <div>
        <p className="text-sm font-bold text-violet-200">
          {game.timeControl.speedLabel}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {game.timeControl.label}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Accuracy
          label="Blancs"
          value={game.whiteAccuracy}
        />
        <Accuracy
          label="Noirs"
          value={game.blackAccuracy}
        />
      </div>

      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <span className="rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-sm font-black text-white">
          {game.result}
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={onOpen}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {loading
            ? "Ouverture…"
            : game.reviewUnlocked
              ? "Revoir le bilan"
              : "Voir le bilan"}
        </button>
      </div>
    </article>
  );
}

function Accuracy({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-emerald-300">
        {value === null
          ? "À calculer"
          : `${value} %`}
      </p>
    </div>
  );
}
