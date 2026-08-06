"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  buildDailyCoachPlan,
} from "@/lib/coach/dailyMission";
import { buildExercise } from "@/lib/exercise/buildExercise";
import { saveExerciseSession } from "@/lib/exercises/exerciseStorage";
import type { LearningProfile } from "@/lib/learning/types";
import {
  getExerciseProgress,
  markExerciseStarted,
  recordTrainingActivity,
} from "@/lib/pgnExerciseProgress";

type StoredMissionState = {
  planId: string;
  answer: number | null;
  rewardClaimed: boolean;
};

const STATE_KEY =
  "chess-coach:daily-coach-session";
const MASTERY_KEY =
  "chess-coach:mastery-stars";

export default function DailyCoachMission({
  profile,
}: {
  profile: LearningProfile | null;
}) {
  const router = useRouter();
  const detailsRef =
    useRef<HTMLDetailsElement>(null);
  const plan = useMemo(
    () => buildDailyCoachPlan(profile),
    [profile],
  );
  const [state, setState] =
    useState<StoredMissionState>({
      planId: plan.id,
      answer: null,
      rewardClaimed: false,
    });
  const [exerciseCompleted, setExerciseCompleted] =
    useState(false);
  const [masteryStars, setMasteryStars] =
    useState(0);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        const stored =
          readMissionState(plan.id);
        const exerciseDone =
          wasExerciseCompletedToday(
            plan.exercise.id,
            plan.date,
          );
        setState(stored);
        setExerciseCompleted(
          exerciseDone,
        );
        setMasteryStars(
          readMasteryStars(),
        );

        const explicitlyFocused =
          new URLSearchParams(
            window.location.search,
          ).get("focus") ===
          "daily-mission";
        const alreadyCompleted =
          stored.answer !== null &&
          exerciseDone;

        if (detailsRef.current) {
          detailsRef.current.open =
            explicitlyFocused ||
            !alreadyCompleted;
        }
        if (explicitlyFocused) {
          if (detailsRef.current) {
            detailsRef.current.open =
              true;
          }
          detailsRef.current?.scrollIntoView(
            {
              behavior: "smooth",
              block: "start",
            },
          );
        }
      },
      0,
    );
    return () =>
      window.clearTimeout(timer);
  }, [
    plan.date,
    plan.exercise.id,
    plan.id,
  ]);

  const quizCompleted =
    state.answer !== null;
  const completed = [
    quizCompleted,
    exerciseCompleted,
  ];
  const completedCount =
    completed.filter(Boolean).length;
  const progress = Math.round(
    (completedCount / completed.length) *
      100,
  );
  const missionCompleted =
    completedCount === completed.length;
  const answerIsCorrect =
    state.answer ===
    plan.concept.correctAnswer;

  useEffect(() => {
    if (
      missionCompleted &&
      state.rewardClaimed &&
      detailsRef.current
    ) {
      detailsRef.current.open = false;
    }
  }, [
    missionCompleted,
    state.rewardClaimed,
  ]);

  function updateState(
    next: StoredMissionState,
  ): void {
    setState(next);
    window.localStorage.setItem(
      STATE_KEY,
      JSON.stringify(next),
    );
  }

  function answerQuiz(
    answer: number,
  ): void {
    if (quizCompleted) return;
    updateState({
      ...state,
      planId: plan.id,
      answer,
    });
  }

  function startExercise(): void {
    const session = buildExercise(
      plan.exercise.pgn,
      {
        id: plan.exercise.id,
        title: plan.exercise.title,
        description:
          plan.exercise.description,
      },
    );
    markExerciseStarted(
      plan.exercise.id,
    );
    recordTrainingActivity("started");
    saveExerciseSession({
      ...session,
      sourceExampleId:
        plan.exercise.id,
      coachNote: `${plan.concept.action} Aujourd’hui, le coach a choisi cette position pour travailler ${plan.focusLabel}.`,
      champion:
        plan.exercise.champion,
      decisionNumber:
        plan.exercise.decisionNumber,
      decisionCount:
        plan.exercise.decisionCount,
      returnHref:
        "/?focus=daily-mission",
      returnLabel:
        "Continuer ma session du jour",
    });
    router.push(
      "/exercises/training",
    );
  }

  function claimReward(): void {
    if (
      !missionCompleted ||
      state.rewardClaimed
    ) {
      return;
    }
    const nextStars =
      readMasteryStars() + 1;
    window.localStorage.setItem(
      MASTERY_KEY,
      String(nextStars),
    );
    setMasteryStars(nextStars);
    updateState({
      ...state,
      planId: plan.id,
      rewardClaimed: true,
    });
    window.dispatchEvent(
      new CustomEvent(
        "chess-coach:mastery-updated",
      ),
    );
  }

  return (
    <details
      ref={detailsRef}
      id="daily-coach"
      className="group scroll-mt-24 overflow-hidden rounded-2xl border border-blue-800/70 bg-gradient-to-br from-blue-950/55 via-gray-900 to-violet-950/35 shadow-xl"
    >
      <summary className="flex min-h-24 cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-300">
              Session du jour
            </p>
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-200">
              5 min
            </span>
            <span className="rounded-full border border-amber-700/50 bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold text-amber-200">
              ★ {masteryStars}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-black text-white sm:text-lg">
            Aujourd’hui : renforcer{" "}
            {plan.focusLabel}
          </p>
          <p className="mt-0.5 hidden text-xs text-gray-400 sm:block">
            Une idée à comprendre, puis une position à résoudre.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
            <span className="text-[11px] font-bold tabular-nums text-gray-400">
              {completedCount}/2
            </span>
          </div>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-700 bg-gray-950/50 text-blue-300 transition group-open:rotate-180">
          ⌄
        </span>
      </summary>

      <div className="border-t border-blue-900/50 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <MissionStep
            number={1}
            title="Comprends l’idée"
            subtitle={
              plan.concept.title
            }
            complete={quizCompleted}
            active={!quizCompleted}
          >
            <p className="text-sm font-semibold leading-6 text-gray-200">
              {plan.concept.question}
            </p>
            <div className="mt-3 space-y-2">
              {plan.concept.answers.map(
                (answer, index) => (
                  <button
                    key={answer}
                    type="button"
                    disabled={quizCompleted}
                    onClick={() =>
                      answerQuiz(index)
                    }
                    className={[
                      "w-full rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition",
                      quizCompleted &&
                      index ===
                        plan.concept
                          .correctAnswer
                        ? "border-emerald-600 bg-emerald-950/35 text-emerald-200"
                        : state.answer ===
                              index &&
                            !answerIsCorrect
                          ? "border-red-700 bg-red-950/30 text-red-200"
                          : "border-gray-700 bg-gray-950/50 text-gray-300 hover:border-blue-600 hover:text-white",
                    ].join(" ")}
                  >
                    {answer}
                  </button>
                ),
              )}
            </div>
            {quizCompleted && (
              <div className="mt-3 rounded-xl border border-blue-800/60 bg-blue-950/25 p-3">
                <p className="text-xs font-black text-blue-200">
                  {answerIsCorrect
                    ? "Bien vu."
                    : "Piège repéré — il ne mordra plus."}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-400">
                  {
                    plan.concept
                      .explanation
                  }
                </p>
              </div>
            )}
          </MissionStep>

          <MissionStep
            number={2}
            title="Résous la position"
            subtitle={
              plan.exercise.title
            }
            complete={exerciseCompleted}
            active={
              quizCompleted &&
              !exerciseCompleted
            }
            locked={!quizCompleted}
          >
            <p className="text-xs leading-5 text-gray-400">
              {
                plan.exercise
                  .description
              }
            </p>
            <button
              type="button"
              disabled={
                !quizCompleted ||
                exerciseCompleted
              }
              onClick={startExercise}
              className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
            >
              {exerciseCompleted
                ? "Position maîtrisée ✓"
                : "Jouer la position"}
            </button>
          </MissionStep>

        </div>

        <div
          className={[
            "mt-3 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
            missionCompleted
              ? "border-amber-600/70 bg-gradient-to-r from-amber-950/35 to-violet-950/30"
              : "border-gray-800 bg-gray-950/45",
          ].join(" ")}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">
              Coffre du coach
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {state.rewardClaimed
                ? "Étoile de maîtrise récupérée"
                : missionCompleted
                  ? "Le coffre est prêt à être ouvert"
                  : `${2 - completedCount} étape${2 - completedCount > 1 ? "s" : ""} avant la récompense`}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Les étoiles représentent ton apprentissage et ne modifient jamais ton Elo.
            </p>
          </div>
          <button
            type="button"
            disabled={
              !missionCompleted ||
              state.rewardClaimed
            }
            onClick={claimReward}
            className="shrink-0 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-gray-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
          >
            {state.rewardClaimed
              ? "★ Obtenue"
              : "Ouvrir le coffre"}
          </button>
        </div>
      </div>
    </details>
  );
}

function MissionStep({
  number,
  title,
  subtitle,
  complete,
  active,
  locked = false,
  children,
}: {
  number: number;
  title: string;
  subtitle: string;
  complete: boolean;
  active: boolean;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={[
        "rounded-2xl border p-4 transition",
        complete
          ? "border-emerald-800/70 bg-emerald-950/20"
          : active
            ? "border-blue-600 bg-blue-950/25 shadow-lg shadow-blue-950/20"
            : "border-gray-800 bg-gray-950/45",
        locked ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black",
            complete
              ? "bg-emerald-500 text-white"
              : active
                ? "bg-blue-500 text-white"
                : "bg-gray-800 text-gray-500",
          ].join(" ")}
        >
          {complete
            ? "✓"
            : locked
              ? "🔒"
              : number}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-gray-100">
            {title}
          </h3>
          <p className="truncate text-xs text-gray-500">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="mt-3">
        {children}
      </div>
    </section>
  );
}

function readMissionState(
  planId: string,
): StoredMissionState {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(
        STATE_KEY,
      ) ?? "{}",
    ) as Partial<StoredMissionState>;
    if (stored.planId === planId) {
      return {
        planId,
        answer:
          typeof stored.answer ===
          "number"
            ? stored.answer
            : null,
        rewardClaimed:
          stored.rewardClaimed ===
          true,
      };
    }
  } catch {
    // Une session corrompue repart proprement.
  }
  return {
    planId,
    answer: null,
    rewardClaimed: false,
  };
}

function wasExerciseCompletedToday(
  exerciseId: string,
  date: string,
): boolean {
  const completedAt =
    getExerciseProgress(
      exerciseId,
    )?.completedAt;
  if (!completedAt) return false;
  const completed = new Date(completedAt);
  const key = [
    completed.getFullYear(),
    String(
      completed.getMonth() + 1,
    ).padStart(2, "0"),
    String(
      completed.getDate(),
    ).padStart(2, "0"),
  ].join("-");
  return key === date;
}

function readMasteryStars(): number {
  const value = Number(
    window.localStorage.getItem(
      MASTERY_KEY,
    ) ?? "0",
  );
  return Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}
