"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Chess } from "chess.js";

import AnalysisPanel from "@/components/Analysis/AnalysisPanel";
import AiOpponentPanel from "@/components/AI/AiOpponentPanel";
import ChessBoard from "@/components/ChessBoard";
import BoardEvaluationBar from "@/components/Board/BoardEvaluationBar";
import type {
  PlayedMoveData,
} from "@/components/ChessBoard";
import GameSummary from "@/components/Coach/GameSummary";
import DailyCoachMission from "@/components/Coach/DailyCoachMission";
import LivePositionOverview from "@/components/Coach/LivePositionOverview";
import MoveReviewCard from "@/components/Coach/MoveReviewCard";
import CoachMentorMessage from "@/components/Coach/CoachMentorMessage";
import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import MoveList from "@/components/PGN/MoveList";
import NavigationControls from "@/components/PGN/NavigationControls";
import PGNInput from "@/components/PGN/PGNInput";
import PlayerStatistics from "@/components/Statistics/PlayerStatistics";

import {
  usePositionAnalysis,
} from "@/hooks/analysis/usePositionAnalysis";
import {
  useMoveReviews,
} from "@/hooks/analysis/useMoveReviews";
import {
  useChessGame,
} from "@/hooks/useChessGame";
import { useLearningProfile } from "@/hooks/useLearningProfile";
import { useAiOpponent } from "@/hooks/useAiOpponent";
import {
  setActiveGameReviewId,
  type MoveReviewResponse,
} from "@/services/api/ApiService";

export default function GameWorkspace({
  initialPgn,
  reviewGameId,
  onReviewSaved,
  currentUser,
}: {
  initialPgn?: string;
  reviewGameId?: string;
  onReviewSaved?: () => void;
  currentUser: CurrentUser | null;
}) {
  const game = useChessGame();
  const aiOpponent = useAiOpponent(game);
  const [recordImportedGame, setRecordImportedGame] = useState(false);
  const importedPgnRef =
    useRef<string | null>(null);
  const savedReviewRef =
    useRef<string | null>(null);

  const positionAnalysis =
    usePositionAnalysis(game.fen);

  const reviews =
    useMoveReviews(game);
  const isGameOver = useMemo(() => new Chess(game.fen).isGameOver(), [game.fen]);
  const handleProfileRecorded = useCallback(() => {
    setRecordImportedGame(false);
  }, []);
  const learningProfile = useLearningProfile({
    moves: game.moves,
    moveReviews: reviews.moveReviews,
    readyToRecord: recordImportedGame || isGameOver,
    onRecorded: handleProfileRecorded,
  });
  const livePrecision = useMemo(() => {
    const maximumIndex =
      reviews.selectedMoveIndex ??
      Number.POSITIVE_INFINITY;
    const playerParity =
      aiOpponent.enabled
        ? aiOpponent.playerColor ===
          "white"
          ? 0
          : 1
        : null;
    const playerReviews = Object.entries(
      reviews.moveReviews,
    )
      .filter(
        ([index]) =>
          Number(index) <= maximumIndex &&
          (playerParity === null ||
            Number(index) % 2 ===
              playerParity),
      )
      .sort(
        ([first], [second]) =>
          Number(first) -
          Number(second),
      )
      .map(([, review]) => review);
    const latest =
      playerReviews[
        playerReviews.length - 1
      ];

    return {
      accuracy:
        playerReviews.length > 0
          ? getEstimatedAccuracy(
              playerReviews,
            )
          : null,
      reviewedMoveCount:
        playerReviews.length,
      impact: latest
        ? getMoveImpact(
            latest.classification,
          )
        : null,
      impactKey: latest
        ? `${latest.played_move}-${playerReviews.length}`
        : "empty",
    };
  }, [
    aiOpponent.enabled,
    aiOpponent.playerColor,
    reviews.moveReviews,
    reviews.selectedMoveIndex,
  ]);

  useEffect(() => {
    setActiveGameReviewId(
      reviewGameId ?? null,
    );

    return () => {
      setActiveGameReviewId(null);
    };
  }, [reviewGameId]);

  useEffect(() => {
    if (
      !initialPgn ||
      importedPgnRef.current ===
        initialPgn
    ) {
      return;
    }

    importedPgnRef.current =
      initialPgn;
    reviews.clearMoveReviews();
    positionAnalysis.clearPositionAnalysis();
    setRecordImportedGame(
      game.loadPGN(initialPgn),
    );
  }, [
    game,
    initialPgn,
    positionAnalysis,
    reviews,
  ]);

  useEffect(() => {
    if (
      !reviewGameId ||
      game.moves.length === 0 ||
      Object.keys(
        reviews.moveReviews,
      ).length < game.moves.length ||
      savedReviewRef.current ===
        reviewGameId
    ) {
      return;
    }

    savedReviewRef.current =
      reviewGameId;
    const whiteReviews =
      getReviewsForSide(
        reviews.moveReviews,
        0,
      );
    const blackReviews =
      getReviewsForSide(
        reviews.moveReviews,
        1,
      );

    void fetch(
      `/api/multiplayer/games/${reviewGameId}/review`,
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          whiteAccuracy:
            getEstimatedAccuracy(
              whiteReviews,
            ),
          blackAccuracy:
            getEstimatedAccuracy(
              blackReviews,
            ),
        }),
      },
    )
      .then((response) => {
        if (response.ok) {
          onReviewSaved?.();
        } else {
          savedReviewRef.current =
            null;
        }
      })
      .catch(() => {
        savedReviewRef.current =
          null;
      });
  }, [
    game.moves.length,
    onReviewSaved,
    reviewGameId,
    reviews.moveReviews,
  ]);

  function handleMovePlayed(
    moveData: PlayedMoveData,
  ): void {
    reviews.handleMovePlayed(
      game.currentMoveIndex,
      moveData,
    );
  }

  function handleReset(): void {
    setRecordImportedGame(false);
    reviews.clearMoveReviews();
    positionAnalysis.clearPositionAnalysis();
    game.reset();
  }

  function handleGoToStart(): void {
    reviews.setSelectedMoveIndex(null);
    game.goToStart();
  }

  function handlePreviousMove(): void {
    const targetPositionIndex =
      Math.max(
        0,
        game.currentMoveIndex - 1,
      );

    reviews.setSelectedMoveIndex(
      targetPositionIndex > 0
        ? targetPositionIndex - 1
        : null,
    );

    game.previousMove();
  }

  function handleNextMove(): void {
    const targetPositionIndex =
      Math.min(
        game.moves.length,
        game.currentMoveIndex + 1,
      );

    reviews.setSelectedMoveIndex(
      targetPositionIndex > 0
        ? targetPositionIndex - 1
        : null,
    );

    game.nextMove();
  }

  function handleGoToEnd(): void {
    const lastPositionIndex =
      game.moves.length;

    reviews.setSelectedMoveIndex(
      lastPositionIndex > 0
        ? lastPositionIndex - 1
        : null,
    );

    game.goToEnd();
  }

  function handleGoToMove(
    positionIndex: number,
  ): void {
    game.goToMove(positionIndex);

    reviews.setSelectedMoveIndex(
      positionIndex > 0
        ? positionIndex - 1
        : null,
    );
  }

  function handlePGNImport(
    pgn: string,
  ): void {
    reviews.clearMoveReviews();
    positionAnalysis.clearPositionAnalysis();
    setRecordImportedGame(game.loadPGN(pgn));
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <section
        id="game-board"
        className="scroll-mt-20 grid items-start justify-center gap-6 xl:grid-cols-[minmax(620px,760px)_minmax(320px,390px)]"
      >
        <div className="min-w-0 space-y-4">
          <div className="flex items-stretch gap-3">
            <BoardEvaluationBar
              analysis={
                positionAnalysis.currentPositionAnalysis
              }
              isLoading={
                positionAnalysis.isCurrentPositionAnalyzing
              }
            />

            <div className="min-w-0 flex-1">
              <ChessBoard
                game={game}
                playerColor={
                  aiOpponent.enabled ? aiOpponent.playerColor : null
                }
                interactionDisabled={aiOpponent.isThinking}
                suggestedMove={
                  positionAnalysis.suggestedMove
                }
                reviewIndicators={
                  reviews.selectedMoveReview
                    ? {
                        playedMove:
                          reviews.selectedMoveReview
                            .played_move,
                        classification:
                          reviews.selectedMoveReview
                            .classification,
                      }
                    : null
                }
                onMovePlayed={
                  handleMovePlayed
                }
                onReset={handleReset}
              />
            </div>
          </div>

          <NavigationControls
            currentMoveIndex={
              game.currentMoveIndex
            }
            totalMoves={
              game.moves.length
            }
            onStart={
              handleGoToStart
            }
            onPrevious={
              handlePreviousMove
            }
            onNext={handleNextMove}
            onEnd={handleGoToEnd}
          />
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-24">
          <AiOpponentPanel
            opponent={aiOpponent}
            context="analysis"
          />
          <LivePositionOverview
            review={
              reviews.selectedMoveReview
            }
            isReviewLoading={
              reviews.isSelectedMoveReviewing
            }
            coachPersonaId={aiOpponent.personaId}
            learningProfile={learningProfile}
            livePrecision={
              livePrecision
            }
          />
        </aside>
      </section>

      <DailyCoachMission
        profile={learningProfile}
      />

      {reviewGameId && (
        <section className="rounded-xl border border-emerald-800/70 bg-emerald-950/25 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">
            Bilan de partie en ligne
          </p>
          <p className="mt-1 text-sm text-gray-300">
            Le Coach IA relit automatiquement chaque coup. Utilise la liste
            des coups pour parcourir ses verdicts, tes moments forts et les
            décisions à retravailler.
          </p>
        </section>
      )}

      <PlayerStatistics
        currentUser={currentUser}
        variant="analysis"
      />

      <section className="grid items-start gap-6 xl:grid-cols-2">
        <div
          id="coach-analysis"
          className="scroll-mt-24"
        >
          <AnalysisPanel
            fen={game.fen}
            autoAnalyse
            showTermExplanations={
              (learningProfile?.rating ??
                1200) < 1200
            }
            coachPersonaId={aiOpponent.personaId}
            learningProfile={learningProfile}
            onAnalysisComplete={
              positionAnalysis.handleAnalysisComplete
            }
            onLoadingChange={
              positionAnalysis.setIsCurrentPositionAnalyzing
            }
          />
        </div>

        <div className="space-y-6">
          <div
            id="move-review"
            className="scroll-mt-24"
          >
            {reviews.selectedPlayedMove ? (
              <MoveReviewCard
                moveData={
                  reviews.selectedPlayedMove
                }
                review={
                  reviews.selectedMoveReview
                }
                isLoading={
                  reviews.isSelectedMoveReviewing
                }
                error={
                  reviews.selectedMoveReviewError
                }
                coachPersonaId={aiOpponent.personaId}
                learningProfile={learningProfile}
                onRetry={() => {
                  if (
                    reviews.selectedMoveIndex ===
                    null
                  ) {
                    return;
                  }

                  void reviews.reviewPlayedMove(
                    reviews.selectedMoveIndex,
                    reviews.selectedPlayedMove!,
                  );
                }}
              />
            ) : (
              <EmptyMoveReview />
            )}
          </div>

          {/*
           * Le bilan du coach est désormais
           * immédiatement sous l’analyse
           * détaillée du coup sélectionné.
           */}
          <div
            id="coach-summary"
            className="scroll-mt-24"
          >
            <GameSummary
              moveReviews={
                reviews.moveReviews
              }
              totalMoves={
                game.moves.length
              }
              selectedMoveIndex={
                reviews.selectedMoveIndex
              }
              onMoveSelect={(moveIndex) => {
                handleGoToMove(moveIndex + 1);
              }}
            />
          </div>
        </div>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
        <PGNInput
          onImport={handlePGNImport}
          onReset={handleReset}
        />

        <div
          id="move-list"
          className="scroll-mt-24"
        >
          <MoveList
            moves={game.moves}
            currentMoveIndex={
              game.currentMoveIndex
            }
            onMoveClick={
              handleGoToMove
            }
            moveReviews={
              reviews.moveReviews
            }
            reviewingMoveIndex={
              reviews.reviewingMoveIndex
            }
          />
        </div>
      </section>
    </div>
  );
}

function getReviewsForSide(
  reviews: Record<
    number,
    MoveReviewResponse
  >,
  parity: 0 | 1,
): MoveReviewResponse[] {
  return Object.entries(reviews)
    .filter(
      ([index]) =>
        Number(index) % 2 === parity,
    )
    .sort(
      ([first], [second]) =>
        Number(first) -
        Number(second),
    )
    .map(([, review]) => review);
}

function getEstimatedAccuracy(
  reviews: MoveReviewResponse[],
): number {
  if (reviews.length === 0) {
    return 0;
  }

  const total = reviews.reduce(
    (sum, review) => {
      const loss = Math.max(
        0,
        Math.min(
          20,
          Math.abs(
            review.evaluation_loss,
          ),
        ),
      );
      return (
        sum +
        100 * Math.exp(-0.45 * loss)
      );
    },
    0,
  );

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(total / reviews.length),
    ),
  );
}

function getMoveImpact(
  classification:
    MoveReviewResponse["classification"],
): number {
  switch (classification) {
    case "excellent":
      return 3;
    case "good":
      return 1;
    case "inaccuracy":
      return -2;
    case "mistake":
      return -5;
    case "blunder":
      return -9;
  }
}

function EmptyMoveReview() {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 shadow-lg">
      <CoachMentorMessage
        compact
        title="Quel coup veux-tu revoir ?"
      >
        Sélectionne un coup dans la partie. Je te donnerai un verdict, ce que
        tu as bien vu et le réflexe à retenir pour la prochaine fois.
      </CoachMentorMessage>
    </section>
  );
}
