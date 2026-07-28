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
    handleAnalysisComplete,
    setIsCurrentPositionAnalyzing,
    clearPositionAnalysis,
  };
}
