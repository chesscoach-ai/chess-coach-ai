"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import LearningSkillPath from "@/components/Exercises/LearningSkillPath";
import PlacementDiagnostic from "@/components/Exercises/PlacementDiagnostic";
import PGNLibraryBrowser from "@/components/PGN/PGNLibraryBrowser";
import {
  PGN_EXAMPLES,
  type PGNExample,
} from "@/data/pgn/examples";
import { buildExercise } from "@/lib/exercise/buildExercise";
import { buildStockfishExercise } from "@/lib/exercise/buildStockfishExercise";
import { saveExerciseSession } from "@/lib/exercises/exerciseStorage";
import { buildSkillPath } from "@/lib/learning/skillPath";
import type { LearningProfile } from "@/lib/learning/types";
import {
  getNextPlacementExerciseId,
  readPlacementSession,
  startPlacementSession,
  writePlacementSession,
  type PlacementResult,
  type PlacementSession,
} from "@/lib/learning/placement";
import {
  getAllExerciseProgress,
  getTrainingStreak,
  markExerciseStarted,
  recordTrainingActivity,
} from "@/lib/pgnExerciseProgress";
import {
  mergeSyncedExerciseProgress,
  type SyncedExerciseProgress,
} from "@/lib/progression/exerciseProgress";
import { buildDailyTrainingPlan } from "@/lib/pgnDailyTrainingPlan";
import DailyCoachMission from "@/components/Coach/DailyCoachMission";

export default function ExerciseLibraryPage({
  embedded = false,
  onTrainingStart,
  onExit,
}: {
  embedded?: boolean;
  onTrainingStart?: () => void;
  onExit?: () => void;
} = {}) {
  const router = useRouter();

  function openTrainer(): void {
    if (onTrainingStart) {
      onTrainingStart();
    } else {
      router.push("/exercises/training");
    }
  }

  const [loadingExerciseId, setLoadingExerciseId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);
  const [trainingStreak, setTrainingStreak] = useState(0);
  const [progressMap, setProgressMap] =
    useState<
      ReturnType<
        typeof getAllExerciseProgress
      >
    >({});
  const [learningProfile, setLearningProfile] =
    useState<LearningProfile | null>(null);
  const [placementSession, setPlacementSession] =
    useState<PlacementSession | null>(null);
  const [placementResult, setPlacementResult] =
    useState<PlacementResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProgress() {
      let storedProgress = getAllExerciseProgress();
      const streak = getTrainingStreak();
      const localPlacement = readPlacementSession();
      setPlacementSession(localPlacement);
      setPlacementResult(localPlacement?.result ?? null);
      try {
        const [progressResponse, profileResponse, placementResponse] =
          await Promise.all([
          fetch("/api/progression/exercises", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/learning/profile", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/learning/placement", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);
        if (progressResponse.ok) {
          const payload = (await progressResponse.json()) as {
            progress?: SyncedExerciseProgress[];
          };
          storedProgress = mergeSyncedExerciseProgress(
            storedProgress,
            payload.progress ?? [],
          );
        }
        if (profileResponse.ok) {
          const payload = (await profileResponse.json()) as {
            profile?: LearningProfile;
          };
          setLearningProfile(payload.profile ?? null);
        }
        let serverPlacement: PlacementResult | null = null;
        if (placementResponse.ok) {
          const payload = (await placementResponse.json()) as {
            result?: PlacementResult | null;
          };
          serverPlacement = payload.result ?? null;
          if (
            serverPlacement &&
            (!localPlacement?.result ||
              serverPlacement.completedAt >
                localPlacement.result.completedAt)
          ) {
            const restored = {
              exerciseIds: serverPlacement.attempts.map(
                (attempt) => attempt.exerciseId,
              ),
              attempts: serverPlacement.attempts,
              result: serverPlacement,
            };
            writePlacementSession(restored);
            setPlacementSession(restored);
            setPlacementResult(serverPlacement);
          }
        }
        if (
          localPlacement?.result &&
          (!serverPlacement ||
            localPlacement.result.completedAt >
              serverPlacement.completedAt)
        ) {
          const syncResponse = await fetch("/api/learning/placement", {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attempts: localPlacement.result.attempts,
            }),
          });
          if (syncResponse.ok) {
            const payload = (await syncResponse.json()) as {
              result?: PlacementResult;
            };
            if (payload.result) {
              setPlacementResult(payload.result);
            }
          }
        }
      } catch {
        if (controller.signal.aborted) return;
        // La carte reste utilisable avec la progression locale hors ligne.
      }
      setProgressMap(storedProgress);

      setTrainingStreak(streak.current);
    }

    void loadProgress();
    return () => controller.abort();
  }, []);

  const skillPath = useMemo(
    () =>
      buildSkillPath({
        examples: PGN_EXAMPLES,
        progress: progressMap,
        profile: learningProfile
          ? {
              primaryWeakness: learningProfile.primaryWeakness,
              rating: learningProfile.rating,
            }
          : placementResult
            ? {
                primaryWeakness: null,
                rating: placementResult.estimatedRating,
              }
            : null,
      }),
    [learningProfile, placementResult, progressMap],
  );
  const dailyPlan = useMemo(
    () => buildDailyTrainingPlan(PGN_EXAMPLES, progressMap),
    [progressMap],
  );

  function startPathExercise(example: PGNExample): void {
    markExerciseStarted(example.id);
    recordTrainingActivity("started");
    void handleSelectExercise(example);
  }

  async function handleSelectExercise(
    example: PGNExample,
    options?: { placement?: boolean },
  ): Promise<void> {
    setError(null);
    setLoadingExerciseId(example.title);

    try {
      const { session, analysis } =
        await buildStockfishExercise(
          example.pgn,
          {
            id: example.id,
            sourceExampleId: example.id,
            title: example.title,

            description: example.description,
            coachNote:
              example.historicalNote,
            champion: example.champion,
            decisionNumber:
              example.decisionNumber,
            decisionCount:
              example.decisionCount,

            depth: 16,
            multipv: 3,
          },
        );

      console.log(
        "Analyse Stockfish de l'exercice :",
        analysis,
      );

      saveExerciseSession(
        options?.placement
          ? {
              ...session,
              returnHref: "/exercises?placement=1",
              returnLabel: "Continuer le diagnostic",
              placementDifficulty: example.difficulty,
            }
          : session,
      );

      openTrainer();
    } catch {
      try {
        const offlineSession = buildExercise(
          example.pgn,
          {
            id: example.id,
            title: example.title,
            description:
              example.description,
          },
        );

        saveExerciseSession({
          ...offlineSession,
          sourceExampleId: example.id,
          coachNote:
            "La vérification automatique est momentanément indisponible : l’exercice reste jouable avec le coup de référence de la partie.",
          champion: example.champion,
          decisionNumber:
            example.decisionNumber,
          decisionCount:
            example.decisionCount,
          ...(options?.placement
            ? {
                returnHref: "/exercises?placement=1",
                returnLabel: "Continuer le diagnostic",
                placementDifficulty: example.difficulty,
              }
            : {}),
        });
        openTrainer();
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Impossible de préparer cet exercice.";

        setError(message);
      }
    } finally {
      setLoadingExerciseId(null);
    }
  }

  function launchPlacement(session: PlacementSession): void {
    const nextId = getNextPlacementExerciseId(session);
    const example = PGN_EXAMPLES.find((item) => item.id === nextId);
    if (!example) return;
    markExerciseStarted(example.id);
    recordTrainingActivity("started");
    void handleSelectExercise(example, { placement: true });
  }

  function startPlacement(): void {
    const session = startPlacementSession(PGN_EXAMPLES);
    writePlacementSession(session);
    setPlacementSession(session);
    setPlacementResult(null);
    launchPlacement(session);
  }

  return (
    <section
      className={
        embedded
          ? "rounded-3xl bg-slate-950 text-white"
          : "min-h-screen bg-slate-950 text-white"
      }
    >
      <div
        className={`mx-auto max-w-6xl ${
          embedded ? "py-2" : "px-4 py-5 sm:px-6 sm:py-7"
        }`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-emerald-400">
              Nox à tes côtés
            </p>

            <h1 className="text-2xl font-black sm:text-3xl">
              Entraînement libre
            </h1>

            <p className="mt-2 text-slate-400">
              Une position ciblée maintenant, toute la bibliothèque si tu veux explorer.
            </p>
          </div>

          {embedded ? (
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
            >
              Retour à Progresser
            </button>
          ) : (
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
          >
            Retour à l’analyse
          </Link>
          )}
        </div>

        {!embedded && <div className="mb-5"><DailyCoachMission profile={learningProfile} /></div>}

        <LearningSkillPath
          path={skillPath}
          dailyPlan={dailyPlan}
          examples={PGN_EXAMPLES}
          streak={trainingStreak}
          isLoading={loadingExerciseId !== null}
          onStart={startPathExercise}
        />

        <details className="group mb-5 rounded-2xl border border-slate-800 bg-slate-900/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">
                Régler mon niveau
              </p>
              <p className="mt-0.5 text-sm text-slate-400">
                Diagnostic rapide en trois positions
              </p>
            </div>
            <span className="text-amber-300 transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="border-t border-slate-800 p-3">
            <PlacementDiagnostic
              session={placementSession}
              result={placementResult}
              isLoading={loadingExerciseId !== null}
              onStart={startPlacement}
              onContinue={() => {
                if (placementSession) launchPlacement(placementSession);
              }}
              onRestart={startPlacement}
            />
          </div>
        </details>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <p className="font-semibold">
              Impossible d’ouvrir cet exercice
            </p>

            <p className="mt-1">
              {error}
            </p>
          </div>
        )}

        <details className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-300">
                Explorer la bibliothèque
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {PGN_EXAMPLES.length} positions, parties de champions et finales iconiques
              </p>
            </div>
            <span className="text-blue-300 transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="border-t border-slate-800 p-3 sm:p-4">
            <PGNLibraryBrowser
              onClose={() =>
                onExit ? onExit() : router.push("/")
              }
              onSelect={handleSelectExercise}
              loadingExerciseId={loadingExerciseId}
            />
          </div>
        </details>
      </div>
    </section>
  );
}
