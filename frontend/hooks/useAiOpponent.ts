"use client";

import { useEffect, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";

import type {
  AiLevelId,
  AiPersonaId,
  PreferredColor,
} from "@/lib/ai/opponents";
import type { ChessGameController } from "@/hooks/useChessGame";

type AiMoveResponse = {
  move: {
    from: Square;
    to: Square;
    san: string;
    promotion: string | null;
  };
  opponent: string;
  estimatedElo: number;
};

export function useAiOpponent(
  game: ChessGameController,
  initiallyEnabled = false,
) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [levelId, setLevelId] = useState<AiLevelId>("club");
  const [personaId, setPersonaId] = useState<AiPersonaId>("balanced");
  const [preferredColor, setPreferredColor] =
    useState<PreferredColor>("white");
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);
  const moveRef = useRef(game.move);
  const requestedFenRef = useRef("");

  useEffect(() => {
    moveRef.current = game.move;
  }, [game.move]);

  useEffect(() => {
    if (!enabled || requestedFenRef.current === game.fen) return;
    const position = new Chess(game.fen);
    const turn = position.turn() === "w" ? "white" : "black";
    if (position.isGameOver() || turn === playerColor) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      requestedFenRef.current = game.fen;
      setIsThinking(true);
      setError("");
      try {
        const response = await fetch("/api/ai-move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fen: game.fen, levelId, personaId }),
          signal: controller.signal,
        });
        const payload = (await response.json()) as
          | AiMoveResponse
          | { message?: string };
        if (!response.ok || !("move" in payload)) {
          throw new Error(
            "message" in payload && payload.message
              ? payload.message
              : "L’adversaire IA ne peut pas jouer.",
          );
        }
        if (!controller.signal.aborted) {
          moveRef.current(payload.move.from, payload.move.to);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          requestedFenRef.current = "";
          setError(
            requestError instanceof Error
              ? requestError.message
              : "L’adversaire IA ne peut pas jouer.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsThinking(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    enabled,
    game.fen,
    levelId,
    personaId,
    playerColor,
    retryNonce,
  ]);

  function startNewGame(): void {
    const resolvedColor =
      preferredColor === "random"
        ? Math.random() >= 0.5
          ? "white"
          : "black"
        : preferredColor;
    requestedFenRef.current = "";
    setPlayerColor(resolvedColor);
    setError("");
    setEnabled(true);
    game.reset();
  }

  function stop(): void {
    requestedFenRef.current = "";
    setEnabled(false);
    setIsThinking(false);
    setError("");
  }

  return {
    enabled,
    levelId,
    personaId,
    preferredColor,
    playerColor,
    isThinking,
    error,
    setLevelId,
    setPersonaId,
    setPreferredColor,
    startNewGame,
    stop,
    retry: () => {
      requestedFenRef.current = "";
      setRetryNonce((value) => value + 1);
    },
  };
}

export type AiOpponentController = ReturnType<typeof useAiOpponent>;
