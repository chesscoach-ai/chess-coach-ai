"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import type { Square } from "chess.js";

import type {
  MoveAnalysis,
  PositionAnalysisResponse,
} from "@/services/api/ApiService";

export type SuggestedMove = {
  from: Square;
  to: Square;
};

export function usePositionAnalysis(
  fen: string,
) {
  const [
    currentPositionAnalysis,
    setCurrentPositionAnalysis,
  ] =
    useState<PositionAnalysisResponse | null>(
      null,
    );

  const [
    isCurrentPositionAnalyzing,
    setIsCurrentPositionAnalyzing,
  ] = useState(false);

  const [suggestedMove, setSuggestedMove] =
    useState<SuggestedMove | null>(null);

  useEffect(() => {
    /*
     * Une analyse appartient à un FEN précis.
     * Elle est donc masquée pendant le calcul
     * de la nouvelle position afin de ne pas
     * afficher une recommandation périmée.
     */
    const resetId = window.setTimeout(() => {
      setSuggestedMove(null);
      setCurrentPositionAnalysis(null);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [fen]);

  const handleAnalysisComplete =
    useCallback(
      (
        analysis:
          PositionAnalysisResponse,
      ): void => {
        setCurrentPositionAnalysis(
          analysis,
        );
      },
      [],
    );

  const selectSuggestedMove = useCallback(
    (move: MoveAnalysis): void => {
      const nextMove = {
        from: move.from_square as Square,
        to: move.to_square as Square,
      };

      setSuggestedMove((current) =>
        current?.from === nextMove.from &&
        current.to === nextMove.to
          ? null
          : nextMove,
      );
    },
    [],
  );

  const selectSuggestedUci = useCallback(
    (move: string): void => {
      const normalized = move.trim().toLowerCase();
      if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(normalized)) {
        return;
      }

      const nextMove = {
        from: normalized.slice(0, 2) as Square,
        to: normalized.slice(2, 4) as Square,
      };
      setSuggestedMove((current) =>
        current?.from === nextMove.from && current.to === nextMove.to
          ? null
          : nextMove,
      );
    },
    [],
  );

  const clearSuggestedMove = useCallback((): void => {
    setSuggestedMove(null);
  }, []);

  const clearPositionAnalysis =
    useCallback((): void => {
      setSuggestedMove(null);
      setCurrentPositionAnalysis(null);
      setIsCurrentPositionAnalyzing(
        false,
      );
    }, []);

  return {
    currentPositionAnalysis,
    isCurrentPositionAnalyzing,
    suggestedMove,
    selectSuggestedMove,
    selectSuggestedUci,
    clearSuggestedMove,
    handleAnalysisComplete,
    setIsCurrentPositionAnalyzing,
    clearPositionAnalysis,
  };
}
