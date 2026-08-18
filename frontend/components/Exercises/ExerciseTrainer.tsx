"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import ExerciseBoard from "@/components/Exercises/ExerciseBoard";
import NoxShell from "@/components/Nox/NoxShell";

import {
  clearExerciseSession,
  getExerciseSession,
  saveExerciseSession,
} from "@/lib/exercises/exerciseStorage";

import type {
  ExerciseMove,
  ExerciseMoveResult,
  ExerciseSession,
} from "@/types/exercise";
import {
  markExerciseCompleted,
  recordTrainingActivity,
} from "@/lib/pgnExerciseProgress";
import {
  readPlacementSession,
  recordPlacementAttempt,
  writePlacementSession,
} from "@/lib/learning/placement";
import { buildExerciseCoachMessage } from "@/lib/coach/contextualCoach";
import type { LearningProfile } from "@/lib/learning/types";
import { useNoxMemory } from "@/hooks/useNoxMemory";
import { useNoxProgression } from "@/hooks/useNoxProgression";

function convertMoveToUci(
  move: ExerciseMove,
): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`
    .trim()
    .toLowerCase();
}

export default function ExerciseTrainer({
  embedded = false,
  onExit,
}: {
  embedded?: boolean;
  onExit?: () => void;
} = {}) {
  const [session, setSession] =
    useState<ExerciseSession | null>(null);
  const [learningProfile, setLearningProfile] =
    useState<LearningProfile | null>(null);
  const noxMemory = useNoxMemory();
  const noxProgression = useNoxProgression();
  const refreshNoxMemory = noxMemory.refresh;
  const refreshNoxProgression = noxProgression.refresh;

  const [visibleHints, setVisibleHints] =
    useState<string[]>([]);
  const [boardResetKey, setBoardResetKey] =
    useState(0);
  const completionRecorded =
    useRef(false);
  const sessionId = session?.id;
  const sessionStatus = session?.status;

  useEffect(() => {
    const loadId = window.setTimeout(() => {
      setSession(getExerciseSession());
    }, 0);

    return () => window.clearTimeout(loadId);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/learning/profile", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          profile?: LearningProfile;
        };
        setLearningProfile(payload.profile ?? null);
      })
      .catch(() => {
        // L’exercice reste jouable avec un coaching local sans profil.
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (session) {
      saveExerciseSession(session);
    }
  }, [session]);

  useEffect(() => {
    if (
      !sessionId ||
      sessionStatus === "correct"
    ) {
      return;
    }

    const timerId = window.setInterval(() => {
      setSession((current) =>
        current &&
        current.status !== "correct"
          ? {
              ...current,
              elapsedTime:
                current.elapsedTime + 1,
            }
          : current,
      );
    }, 1_000);

    return () =>
      window.clearInterval(timerId);
  }, [sessionId, sessionStatus]);

  useEffect(() => {
    if (
      !session ||
      session.status !== "correct" ||
      !session.sourceExampleId ||
      completionRecorded.current
    ) {
      return;
    }

    completionRecorded.current = true;
    markExerciseCompleted(
      session.sourceExampleId,
      {
        elapsedTime:
          session.elapsedTime,
        mistakes: session.mistakes,
        hintsUsed: session.hintsUsed,
      },
    );
    recordTrainingActivity("completed");
    if (session.placementDifficulty) {
      const placement = readPlacementSession();
      if (placement) {
        writePlacementSession(
          recordPlacementAttempt(placement, {
            exerciseId: session.sourceExampleId,
            difficulty: session.placementDifficulty,
            elapsedTime: session.elapsedTime,
            mistakes: session.mistakes,
            hintsUsed: session.hintsUsed,
          }),
        );
      }
    }
    void fetch(
      session.missionId ? "/api/nox/missions" : "/api/progression/exercises",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(session.missionId ? {
          action: "result",
          missionId: session.missionId,
          exerciseId: session.sourceExampleId,
          success: session.mistakes === 0,
          mistakes: session.mistakes,
          hintsUsed: session.hintsUsed,
        } : {
          exerciseId: session.sourceExampleId,
          elapsedTime: session.elapsedTime,
          mistakes: session.mistakes,
          hintsUsed: session.hintsUsed,
        }),
      },
    )
      .then((response) => {
        if (response.ok) return Promise.all([refreshNoxMemory(), refreshNoxProgression()]).then(() => undefined);
      })
      .catch(() => {
        // La progression locale reste disponible hors ligne.
        // La synchronisation classée reprendra à la prochaine session.
      });
  }, [refreshNoxMemory, refreshNoxProgression, session]);

  function handleMovePlayed(
    move: ExerciseMove,
  ): ExerciseMoveResult {
    if (!session || session.status === "correct") {
      return { correct: false };
    }

    const playedMove = convertMoveToUci(move);
    const solutionLine =
      session.solutionLine?.length
        ? session.solutionLine
        : [
            {
              uci: session.solutionMove,
              san:
                session.solutionSan ??
                session.solutionMove,
            },
          ];
    const currentPly = session.currentPly ?? 0;
    const expected =
      solutionLine[currentPly] ??
      solutionLine[0];
    const expectedMove =
      expected?.uci.trim().toLowerCase() ?? "";

    /*
     * Pour les coups classiques, la solution peut
     * être enregistrée sous la forme e2e4.
     *
     * Pour une promotion, elle peut être enregistrée
     * sous la forme e7e8q.
     */
    const moveWithoutPromotion =
      `${move.from}${move.to}`.toLowerCase();

    const moveIsCorrect =
      playedMove === expectedMove ||
      moveWithoutPromotion === expectedMove;

    if (moveIsCorrect) {
      const opponent =
        solutionLine[currentPly + 1];
      const nextPlayerPly =
        currentPly +
        (opponent ? 2 : 1);
      const exerciseComplete =
        nextPlayerPly >= solutionLine.length;
      setSession({
        ...session,
        currentPly: nextPlayerPly,
        status: exerciseComplete
          ? "correct"
          : "idle",
      });

      return {
        correct: true,
        opponentMove: opponent?.uci,
      };
    }

    setSession({
      ...session,
      status: "incorrect",
      mistakes: session.mistakes + 1,
    });

    return { correct: false };
  }

  function handleShowHint(): void {
    if (!session) {
      return;
    }

    const nextHint =
      session.hints[visibleHints.length];

    if (!nextHint) {
      return;
    }

    setVisibleHints((currentHints) => [
      ...currentHints,
      nextHint,
    ]);

    setSession({
      ...session,
      hintsUsed: session.hintsUsed + 1,
    });
  }

  function handleReset(): void {
    setVisibleHints([]);
    setBoardResetKey((value) => value + 1);
    completionRecorded.current = false;

    setSession((currentSession) => {
      if (!currentSession) {
        return null;
      }

      return {
        ...currentSession,
        status: "idle",
        mistakes: 0,
        hintsUsed: 0,
        elapsedTime: 0,
        currentPly: 0,
      };
    });
  }

  function handleLeaveExercise(
    destination = "/exercises",
  ): void {
    clearExerciseSession();
    if (onExit) {
      onExit();
    } else {
      window.location.assign(destination);
    }
  }

  if (!session) {
    return (
      <main className={`flex items-center justify-center bg-gray-950 px-4 text-white ${embedded ? "min-h-96" : "min-h-screen"}`}>
        <div className="w-full max-w-xl rounded-3xl border border-gray-800 bg-gray-900 p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-bold">
            Aucun exercice sélectionné
          </h1>

          <p className="mt-3 text-gray-400">
            Sélectionne un exercice dans la
            bibliothèque pour commencer une session
            d’entraînement.
          </p>

          <button
            type="button"
            onClick={() => handleLeaveExercise()}
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
          >
            Ouvrir la bibliothèque
          </button>
        </div>
      </main>
    );
  }

  const exerciseIsFinished =
    session.status === "correct";
  const solutionLine =
    session.solutionLine?.length
      ? session.solutionLine
      : [
          {
            uci: session.solutionMove,
            san:
              session.solutionSan ??
              session.solutionMove,
          },
        ];
  const playerMoveCount = Math.ceil(
    solutionLine.length / 2,
  );
  const currentPlayerMove = Math.min(
    playerMoveCount,
    Math.floor((session.currentPly ?? 0) / 2) + 1,
  );
  const expectedHintMove =
    solutionLine[
      Math.min(
        session.currentPly ?? 0,
        solutionLine.length - 1,
      )
    ]?.uci ?? session.solutionMove;
  const hintMove =
    visibleHints.length >= 3
      ? {
          from: expectedHintMove.slice(
            0,
            2,
          ),
          to: expectedHintMove.slice(
            2,
            4,
          ),
        }
      : null;
  const formattedTime = `${Math.floor(
    session.elapsedTime / 60,
  )}:${String(
    session.elapsedTime % 60,
  ).padStart(2, "0")}`;
  const coachMessage = buildExerciseCoachMessage({
    profile: learningProfile,
    exerciseId: session.id,
    mistakes: session.mistakes,
    hintsUsed: session.hintsUsed,
    elapsedTime: session.elapsedTime,
    status: session.status,
  });

  return (
    <main className={`${embedded ? "min-h-0" : "min-h-screen"} bg-gray-950 px-3 py-4 text-white sm:px-5 sm:py-6 lg:px-6`}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-800 bg-gray-900/70 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-400">
              {session.champion
                ? `Dans la peau de ${session.champion}`
                : "Mode entraînement"}
            </p>

            <h1 className="mt-1 text-lg font-black sm:text-xl">
              {session.title}
            </h1>

            <p className="mt-1 max-w-2xl text-xs text-gray-400 sm:text-sm">
              {session.description ??
                "Trouve le meilleur coup dans cette position."}
            </p>

            {session.missionId && (
              <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-indigo-300">
                Mission de Nox · Position {session.missionStep} / {session.missionTotal}
              </p>
            )}

            {session.decisionNumber &&
              session.decisionCount && (
                <p className="mt-3 text-sm font-semibold text-violet-300">
                  Décision{" "}
                  {session.decisionNumber} sur{" "}
                  {session.decisionCount}
                </p>
              )}
          </div>

          <button
            type="button"
            onClick={() => handleLeaveExercise()}
            className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-gray-900 hover:text-white"
          >
            Quitter l’exercice
          </button>
        </header>

        <div className="grid items-start justify-center gap-5 xl:grid-cols-[minmax(600px,760px)_minmax(300px,360px)]">
          <section className="min-w-0 rounded-3xl border border-gray-800 bg-gray-900/50 p-2 shadow-2xl sm:p-3">
            <ExerciseBoard
              key={`${session.id}-${boardResetKey}`}
              startFen={session.startFen}
              playerColor={session.playerColor}
              disabled={exerciseIsFinished}
              hintMove={hintMove}
              onMovePlayed={handleMovePlayed}
            />
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">
                    À toi de jouer
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Les{" "}
                    {session.playerColor === "white"
                      ? "Blancs"
                      : "Noirs"}{" "}
                    doivent trouver le meilleur coup.
                  </p>
                  {playerMoveCount > 1 && !exerciseIsFinished && (
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-300">
                      Coup {currentPlayerMove} sur {playerMoveCount}
                    </p>
                  )}
                </div>

                <div
                  className={[
                    "h-3 w-3 rounded-full",
                    exerciseIsFinished
                      ? "bg-emerald-400"
                      : "animate-pulse bg-blue-400",
                  ].join(" ")}
                />
              </div>

              <div className="mt-5">
                <NoxShell
                  context={{
                    contextKey: `${session.id}:${session.currentPly ?? 0}:${session.status}`,
                    mode: "exercise",
                    exerciseStatus: session.status,
                    primaryMessage: coachMessage.message,
                    exerciseHint:
                      visibleHints[visibleHints.length - 1] ?? null,
                    memory: noxMemory.memory?.summary ?? null,
                    progression: noxProgression.progression,
                  }}
                  showQuickActions={false}
                />
              </div>

              {session.coachNote && (
                <details className="mt-3 rounded-xl border border-gray-800 bg-gray-950/40">
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold text-gray-400">
                    Contexte de cette position
                  </summary>
                  <p className="border-t border-gray-800 px-3 py-2 text-xs leading-5 text-gray-500">
                    {session.coachNote}
                  </p>
                </details>
              )}

              {session.status === "correct" && (
                <div className="mt-5 rounded-2xl border border-emerald-700 bg-emerald-950/40 p-4">
                  <p className="font-bold text-emerald-300">
                    Excellent coup ! Le roi adverse commence à chercher une sortie.
                  </p>

                  <p className="mt-1 text-sm leading-6 text-emerald-200/80">
                    {session.mistakes === 0 &&
                    session.hintsUsed === 0
                      ? "Trouvé sans aide : ta lecture de la position est très solide."
                      : "Bien joué. Reviens sur cette position plus tard pour l’ancrer sans aide — la prochaine fois, aucune pitié pour l’échiquier."}
                  </p>

                  <p className="mt-3 text-sm font-semibold text-emerald-200">
                    Solution :{" "}
                    {solutionLine
                      .map((move) => move.san)
                      .join(" → ")}
                  </p>
                </div>
              )}

              {session.status === "incorrect" && (
                <div className="mt-5 rounded-2xl border border-red-800 bg-red-950/40 p-4">
                  <p className="font-bold text-red-300">
                    Ce n’est pas le meilleur coup.
                  </p>

                  <p className="mt-1 text-sm leading-6 text-red-200/80">
                    Le coup a été annulé. Analyse
                    encore la position ou demande un
                    indice.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-bold">
                  Indices
                </h2>

                <span className="text-sm text-gray-500">
                  {session.hintsUsed}/
                  {session.hints.length}
                </span>
              </div>

              {visibleHints.length === 0 && (
                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Essaie d’abord de résoudre la
                  position sans aide.
                </p>
              )}

              {visibleHints.length > 0 && (
                <div className="mt-4 space-y-3">
                  {visibleHints.map((hint, index) => (
                    <div
                      key={`${hint}-${index}`}
                      className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-3 text-sm leading-6 text-amber-100"
                    >
                      <span className="font-bold">
                        Indice {index + 1} :
                      </span>{" "}
                      {hint}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={
                  exerciseIsFinished ||
                  visibleHints.length >=
                    session.hints.length
                }
                onClick={handleShowHint}
                className="mt-4 w-full rounded-xl border border-gray-700 px-4 py-3 font-semibold transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Afficher un indice
              </button>
            </section>

            <section className="flex items-center justify-around rounded-2xl border border-gray-800 bg-gray-900 px-3 py-3 text-center">
              <CompactStat label="Erreurs" value={String(session.mistakes)} />
              <span className="h-8 w-px bg-gray-800" />
              <CompactStat label="Indices" value={String(session.hintsUsed)} />
              <span className="h-8 w-px bg-gray-800" />
              <CompactStat label="Temps" value={formattedTime} />
            </section>

            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-xl border border-gray-700 px-4 py-3 font-semibold text-gray-300 transition hover:bg-gray-900 hover:text-white"
            >
              Recommencer l’exercice
            </button>

            {exerciseIsFinished && (
              <button
                type="button"
                onClick={() =>
                  handleLeaveExercise(
                    session.returnHref ?? "/exercises",
                  )
                }
                className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-semibold transition hover:bg-blue-500"
              >
                {session.returnLabel ??
                  "Choisir un autre exercice"}
              </button>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20">
      <p className="text-base font-black text-white">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
    </div>
  );
}
