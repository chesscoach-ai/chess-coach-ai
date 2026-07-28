"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import PGNLibraryBrowser from "@/components/PGN/PGNLibraryBrowser";
import {
  PGN_EXAMPLES,
  type PGNExample,
} from "@/data/pgn/examples";
import { buildExercise } from "@/lib/exercise/buildExercise";
import { buildStockfishExercise } from "@/lib/exercise/buildStockfishExercise";
import { saveExerciseSession } from "@/lib/exercises/exerciseStorage";
import {
  getAllExerciseProgress,
  getTrainingStreak,
  markExerciseStarted,
  recordTrainingActivity,
} from "@/lib/pgnExerciseProgress";

export default function ExerciseLibraryPage() {
  const router = useRouter();

  const [loadingExerciseId, setLoadingExerciseId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);
  const [progress, setProgress] =
    useState(() => ({ completed: 0, streak: 0 }));
  const [progressMap, setProgressMap] =
    useState<
      ReturnType<
        typeof getAllExerciseProgress
      >
    >({});

  useEffect(() => {
    const loadId = window.setTimeout(() => {
      const storedProgress =
        getAllExerciseProgress();
      const streak = getTrainingStreak();
      setProgressMap(storedProgress);

      setProgress({
        completed: Object.values(
          storedProgress,
        ).filter(
          (item) =>
            item.completedAt !== null,
        ).length,
        streak: streak.current,
      });
    }, 0);

    return () =>
      window.clearTimeout(loadId);
  }, []);

  const recommendedExercise =
    useMemo(() => {
      return (
        PGN_EXAMPLES.find(
          (example) =>
            progressMap[example.id]
              ?.needsReview,
        ) ??
        PGN_EXAMPLES.find(
          (example) =>
            !progressMap[example.id],
        ) ??
        PGN_EXAMPLES[0]
      );
    }, [progressMap]);

  function startRecommendedExercise(): void {
    if (!recommendedExercise) {
      return;
    }

    markExerciseStarted(
      recommendedExercise.id,
    );
    recordTrainingActivity("started");
    void handleSelectExercise(
      recommendedExercise,
    );
  }

  async function handleSelectExercise(
    example: PGNExample,
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

      saveExerciseSession(session);

      router.push("/exercises/training");
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
            "Stockfish est momentanément indisponible : l’exercice reste jouable avec le coup de référence de la partie.",
          champion: example.champion,
          decisionNumber:
            example.decisionNumber,
          decisionCount:
            example.decisionCount,
        });
        router.push("/exercises/training");
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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-emerald-400">
              Chess Coach
            </p>

            <h1 className="text-3xl font-bold">
              Bibliothèque d’exercices
            </h1>

            <p className="mt-2 text-slate-400">
              {PGN_EXAMPLES.length} positions légales à résoudre,
              des finales techniques aux décisions de champions.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
          >
            Retour à l’analyse
          </Link>
        </div>

        <section className="mb-7 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_1fr_1fr]">
          <button
            type="button"
            onClick={startRecommendedExercise}
            disabled={
              loadingExerciseId !== null
            }
            className="rounded-2xl border border-emerald-700/60 bg-emerald-950/25 p-5 text-left transition hover:border-emerald-500 hover:bg-emerald-950/40 disabled:opacity-60"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Séance conseillée par le coach
            </p>
            <p className="mt-2 text-lg font-bold">
              {recommendedExercise?.title}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Priorité aux positions à revoir, puis aux exercices encore inconnus.
            </p>
          </button>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Série actuelle
            </p>
            <p className="mt-2 text-3xl font-bold text-orange-300">
              🔥 {progress.streak} jour
              {progress.streak > 1
                ? "s"
                : ""}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Positions maîtrisées
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-300">
              {progress.completed}
            </p>
          </div>
        </section>

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

        <PGNLibraryBrowser
          onClose={() => router.push("/")}
          onSelect={handleSelectExercise}
          loadingExerciseId={loadingExerciseId}
        />
      </div>
    </main>
  );
}
