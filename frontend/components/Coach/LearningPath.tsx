"use client";

import type { LearningProfile } from "@/lib/learning/types";

type LearningPathProps = {
  moveCount: number;
  hasPositionAnalysis: boolean;
  reviewedMoveCount: number;
  profile: LearningProfile | null;
};

export default function LearningPath({
  moveCount,
  hasPositionAnalysis,
  reviewedMoveCount,
  profile,
}: LearningPathProps) {
  const weaknessTitle = profile?.primaryWeaknessLabel
    ? `Renforce ${profile.primaryWeaknessLabel}`
    : "Retiens une leçon";
  const weaknessAction =
    profile?.recommendations[0]?.action ??
    "Repère ta priorité et transforme-la en entraînement.";
  const steps = [
    {
      id: "game-board",
      title: "Joue ou importe",
      description: "Construis une position ou charge une partie réelle.",
    },
    {
      id: "stockfish-analysis",
      title: "Comprends",
      description: "Découvre le meilleur plan avec des mots simples.",
    },
    {
      id: "coach-summary",
      title: weaknessTitle,
      description: weaknessAction,
    },
  ] as const;
  const completed = [
    moveCount > 0,
    hasPositionAnalysis,
    reviewedMoveCount > 0,
  ];
  const currentStep = completed.findIndex((value) => !value);
  const activeStep =
    currentStep < 0 ? steps.length - 1 : Math.min(currentStep, steps.length - 1);

  function goTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <section className="rounded-2xl border border-blue-900/60 bg-gradient-to-r from-blue-950/45 to-gray-900 p-4 shadow-lg sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
            Ton parcours personnalisé
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            {profile
              ? `${profile.playerName}, ton coach prépare la prochaine étape`
              : "Une partie, une leçon, un progrès"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-300">
            {profile?.message ??
              "Analyse une première partie pour obtenir des conseils adaptés à ton niveau et à tes habitudes de jeu."}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {profile && (
            <>
              <ProfileBadge label="Niveau" value={profile.levelLabel} />
              <ProfileBadge label="Elo" value={String(profile.rating)} />
            </>
          )}
          <ProfileBadge
            label="Historique"
            value={
              profile
                ? `${profile.sessionsCount} partie${profile.sessionsCount > 1 ? "s" : ""}`
                : reviewedMoveCount > 0
                  ? `${reviewedMoveCount} coups`
                  : "À construire"
            }
          />
        </div>
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-3">
        {steps.map((step, index) => {
          const isComplete = completed[index];
          const isActive = index === activeStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => goTo(step.id)}
              className={[
                "rounded-xl border p-4 text-left transition",
                isActive
                  ? "border-blue-600 bg-blue-950/50"
                  : "border-gray-800 bg-gray-950/40 hover:border-gray-700",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                    isComplete
                      ? "bg-emerald-500/20 text-emerald-300"
                      : isActive
                        ? "bg-blue-500 text-white"
                        : "bg-gray-800 text-gray-500",
                  ].join(" ")}
                >
                  {isComplete ? "✓" : index + 1}
                </span>
                <span className="text-sm font-semibold text-gray-100">
                  {step.title}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-400">
                {step.description}
              </p>
            </button>
          );
        })}
      </div>

      {profile && profile.recommendations.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-blue-900/40 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Ensuite :
          </span>
          {profile.recommendations.slice(1).map((recommendation) => (
            <span
              key={recommendation.theme}
              className="rounded-full border border-gray-700 bg-gray-950/50 px-3 py-1 text-xs text-gray-300"
            >
              {recommendation.title}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function ProfileBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-950/55 px-3 py-2 text-right">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-bold text-gray-200">{value}</p>
    </div>
  );
}
