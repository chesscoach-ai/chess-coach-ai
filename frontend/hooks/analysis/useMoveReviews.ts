"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  PlayedMoveData,
} from "@/components/ChessBoard";
import type {
  MoveReviewResponse,
} from "@/services/api/ApiService";
import {
  AnalysisApiError,
  ApiService,
} from "@/services/api/ApiService";
import {
  useChessGame,
} from "@/hooks/useChessGame";

type ChessGameController =
  ReturnType<typeof useChessGame>;

type AnalysisProgress = {
  completed: number;
  total: number;
};

export function useMoveReviews(
  game: ChessGameController,
) {
  const [playedMoves, setPlayedMoves] =
    useState<
      Record<number, PlayedMoveData>
    >({});

  const [moveReviews, setMoveReviews] =
    useState<
      Record<number, MoveReviewResponse>
    >({});

  const [
    moveReviewErrors,
    setMoveReviewErrors,
  ] = useState<Record<number, string>>(
    {},
  );

  const [
    reviewingMoveIndex,
    setReviewingMoveIndex,
  ] = useState<number | null>(null);

  const [
    selectedMoveIndex,
    setSelectedMoveIndex,
  ] = useState<number | null>(null);

  const [
    isAnalyzingGame,
    setIsAnalyzingGame,
  ] = useState(false);

  const [
    gameAnalysisProgress,
    setGameAnalysisProgress,
  ] = useState<AnalysisProgress>({
    completed: 0,
    total: 0,
  });

  const reviewRequestIdRef =
    useRef(0);
  const gameAnalysisIdRef =
    useRef(0);
  const reviewAbortRef = useRef<AbortController | null>(null);
  const gameAnalysisAbortRef = useRef<AbortController | null>(null);

  /*
   * Synchronise immédiatement les données
   * des coups lors d'un import PGN. Le résumé
   * peut ainsi s'afficher avant même la fin
   * de l'analyse Stockfish.
   */
  useEffect(() => {
    const imported =
      game.moveData.reduce<
        Record<
          number,
          PlayedMoveData
        >
      >((entries, move, index) => {
        entries[index] = {
          fenBefore: move.fenBefore,
          fenAfter: move.fenAfter,
          playedMove: move.uci,
          from: move.from,
          to: move.to,
        };

        return entries;
      }, {});

    const syncId = window.setTimeout(() => {
      setPlayedMoves(imported);
    }, 0);

    return () => window.clearTimeout(syncId);
  }, [game.moveData]);

  const selectedPlayedMove =
    selectedMoveIndex !== null
      ? playedMoves[
          selectedMoveIndex
        ] ?? null
      : null;

  const selectedMoveReview =
    selectedMoveIndex !== null
      ? moveReviews[
          selectedMoveIndex
        ] ?? null
      : null;

  const selectedMoveReviewError =
    selectedMoveIndex !== null
      ? moveReviewErrors[
          selectedMoveIndex
        ] ?? null
      : null;

  const isSelectedMoveReviewing =
    selectedMoveIndex !== null &&
    reviewingMoveIndex ===
      selectedMoveIndex;

  const reviewPlayedMove =
    useCallback(
      async (
        moveIndex: number,
        moveData: PlayedMoveData,
      ): Promise<void> => {
        const requestId =
          reviewRequestIdRef.current +
          1;

        reviewRequestIdRef.current =
          requestId;
        reviewAbortRef.current?.abort();
        const controller = new AbortController();
        reviewAbortRef.current = controller;

        setReviewingMoveIndex(
          moveIndex,
        );

        setMoveReviewErrors(
          (current) => {
            const updated = {
              ...current,
            };

            delete updated[moveIndex];
            return updated;
          },
        );

        try {
          const review =
            await ApiService.reviewMove(
              {
                fen_before: moveData.fenBefore,
                played_move: moveData.playedMove,
                depth: 15,
              },
              { signal: controller.signal },
            );

          if (
            requestId !==
            reviewRequestIdRef.current
          ) {
            return;
          }

          setMoveReviews(
            (current) => ({
              ...current,
              [moveIndex]: review,
            }),
          );
        } catch (error) {
          if (
            requestId !==
            reviewRequestIdRef.current
          ) {
            return;
          }

          if (
            error instanceof AnalysisApiError &&
            error.kind === "cancelled"
          ) {
            return;
          }
          const message =
            error instanceof Error
              ? error.message
              : "Impossible d’analyser le coup joué.";

          setMoveReviewErrors(
            (current) => ({
              ...current,
              [moveIndex]: message,
            }),
          );
        } finally {
          if (
            requestId ===
            reviewRequestIdRef.current
          ) {
            setReviewingMoveIndex(
              null,
            );
          }
        }
      },
      [],
    );

  const analyzeMissingMoves =
    useCallback(async (): Promise<void> => {
      if (
        isAnalyzingGame ||
        game.moveData.length === 0
      ) {
        return;
      }

      const missingMoveIndexes =
        game.moveData
          .map((_, index) => index)
          .filter(
            (index) =>
              !moveReviews[index],
          );

      if (
        missingMoveIndexes.length ===
        0
      ) {
        return;
      }

      const analysisId =
        gameAnalysisIdRef.current +
        1;

      gameAnalysisIdRef.current =
        analysisId;
      gameAnalysisAbortRef.current?.abort();
      const controller = new AbortController();
      gameAnalysisAbortRef.current = controller;

      reviewRequestIdRef.current += 1;
      setIsAnalyzingGame(true);
      setGameAnalysisProgress({
        completed: 0,
        total:
          missingMoveIndexes.length,
      });

      let completed = 0;

      try {
        for (
          const moveIndex of
          missingMoveIndexes
        ) {
          if (
            analysisId !==
            gameAnalysisIdRef.current
          ) {
            return;
          }

          const move =
            game.moveData[
              moveIndex
            ];

          if (!move) {
            continue;
          }

          setReviewingMoveIndex(
            moveIndex,
          );

          try {
            const review =
              await ApiService.reviewMove(
                {
                  fen_before:
                    move.fenBefore,
                  played_move:
                    move.uci,
                  depth: 15,
                },
                { signal: controller.signal },
              );

            if (
              analysisId !==
              gameAnalysisIdRef.current
            ) {
              return;
            }

            setMoveReviews(
              (current) => ({
                ...current,
                [moveIndex]: review,
              }),
            );

            setMoveReviewErrors(
              (current) => {
                const updated = {
                  ...current,
                };
                delete updated[
                  moveIndex
                ];
                return updated;
              },
            );
          } catch (error) {
            if (
              analysisId !==
              gameAnalysisIdRef.current
            ) {
              return;
            }

            if (
              error instanceof AnalysisApiError &&
              error.kind === "cancelled"
            ) {
              return;
            }
            const message =
              error instanceof Error
                ? error.message
                : "Impossible d’analyser ce coup.";

            setMoveReviewErrors(
              (current) => ({
                ...current,
                [moveIndex]: message,
              }),
            );
          } finally {
            if (
              analysisId ===
              gameAnalysisIdRef.current
            ) {
              completed += 1;
              setGameAnalysisProgress({
                completed,
                total:
                  missingMoveIndexes.length,
              });
            }
          }
        }
      } finally {
        if (
          analysisId ===
          gameAnalysisIdRef.current
        ) {
          setReviewingMoveIndex(
            null,
          );
          setIsAnalyzingGame(false);
        }
      }
    }, [
      game.moveData,
      isAnalyzingGame,
      moveReviews,
    ]);

  /*
   * L'analyse complète est automatique.
   * Le délai absorbe les changements rapides
   * pendant un import ou une navigation.
   */
  useEffect(() => {
    if (
      game.moveData.length === 0 ||
      isAnalyzingGame
    ) {
      return;
    }

    const hasMissingReview =
      game.moveData.some(
        (_, index) =>
          !moveReviews[index],
      );

    if (!hasMissingReview) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        void analyzeMissingMoves();
      }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    analyzeMissingMoves,
    game.moveData,
    isAnalyzingGame,
    moveReviews,
  ]);

  const handleMovePlayed =
    useCallback(
      (
        moveIndex: number,
        moveData: PlayedMoveData,
      ): void => {
        setPlayedMoves((current) =>
          removeEntriesFromIndex(
            current,
            moveIndex,
            moveData,
          ),
        );

        setMoveReviews((current) =>
          removeEntriesFromIndex(
            current,
            moveIndex,
          ),
        );

        setMoveReviewErrors(
          (current) =>
            removeEntriesFromIndex(
              current,
              moveIndex,
            ),
        );

        setSelectedMoveIndex(
          moveIndex,
        );
      },
      [],
    );

  const cancelAnalysis =
    useCallback((): void => {
      reviewAbortRef.current?.abort();
      gameAnalysisAbortRef.current?.abort();
      gameAnalysisIdRef.current += 1;
      reviewRequestIdRef.current += 1;
      setReviewingMoveIndex(null);
      setIsAnalyzingGame(false);
    }, []);

  const clearMoveReviews =
    useCallback((): void => {
      cancelAnalysis();
      setPlayedMoves({});
      setMoveReviews({});
      setMoveReviewErrors({});
      setSelectedMoveIndex(null);
      setGameAnalysisProgress({
        completed: 0,
        total: 0,
      });
    }, [cancelAnalysis]);

  return {
    playedMoves,
    moveReviews,
    moveReviewErrors,
    reviewingMoveIndex,
    selectedMoveIndex,
    selectedPlayedMove,
    selectedMoveReview,
    selectedMoveReviewError,
    isSelectedMoveReviewing,
    isAnalyzingGame,
    gameAnalysisProgress,
    setSelectedMoveIndex,
    reviewPlayedMove,
    handleMovePlayed,
    analyzeMissingMoves,
    cancelAnalysis,
    clearMoveReviews,
  };
}

function removeEntriesFromIndex<T>(
  entries: Record<number, T>,
  startIndex: number,
  replacement?: T,
): Record<number, T> {
  const updated: Record<number, T> =
    {};

  Object.entries(entries).forEach(
    ([indexAsString, value]) => {
      const index = Number(
        indexAsString,
      );

      if (index < startIndex) {
        updated[index] = value;
      }
    },
  );

  if (replacement !== undefined) {
    updated[startIndex] =
      replacement;
  }

  return updated;
}
