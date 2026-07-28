"use client";

import type {
  PGNExerciseProgress,
  PGNTrainingActivity,
} from "@/lib/pgnExerciseProgress";

type PGNTrainingDashboardProps = {
  totalExercises: number;
  progress: Record<
    string,
    PGNExerciseProgress
  >;
  activity: PGNTrainingActivity[];
  currentStreak: number;
  bestStreak: number;
  activeDays: number;
};

type Achievement = {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
};

export default function PGNTrainingDashboard({
  totalExercises,
  progress,
  activity,
  currentStreak,
  bestStreak,
  activeDays,
}: PGNTrainingDashboardProps) {
  const started = Object.keys(
    progress,
  ).length;
  const completed = Object.values(
    progress,
  ).filter(
    (item) =>
      item.completedAt !== null,
  ).length;
  const attempts = Object.values(
    progress,
  ).reduce(
    (sum, item) =>
      sum + item.attempts,
    0,
  );

  const achievements: Achievement[] = [
    {
      id: "first-step",
      icon: "♟",
      title: "Premier pas",
      description:
        "Commencer un premier exercice.",
      unlocked: started >= 1,
      progress: Math.min(started, 1),
      target: 1,
    },
    {
      id: "finisher",
      icon: "✓",
      title: "Première victoire",
      description:
        "Terminer un exercice.",
      unlocked: completed >= 1,
      progress: Math.min(
        completed,
        1,
      ),
      target: 1,
    },
    {
      id: "regular",
      icon: "🔥",
      title: "Régulier",
      description:
        "S’entraîner 3 jours consécutifs.",
      unlocked: bestStreak >= 3,
      progress: Math.min(
        bestStreak,
        3,
      ),
      target: 3,
    },
    {
      id: "persistent",
      icon: "↻",
      title: "Persévérant",
      description:
        "Cumuler 10 tentatives.",
      unlocked: attempts >= 10,
      progress: Math.min(
        attempts,
        10,
      ),
      target: 10,
    },
    {
      id: "collector",
      icon: "★",
      title: "Explorateur",
      description:
        "Commencer 10 exercices différents.",
      unlocked: started >= 10,
      progress: Math.min(
        started,
        10,
      ),
      target: 10,
    },
    {
      id: "mastery",
      icon: "♛",
      title: "Maîtrise",
      description:
        "Terminer toute la bibliothèque.",
      unlocked:
        totalExercises > 0 &&
        completed >= totalExercises,
      progress: Math.min(
        completed,
        totalExercises,
      ),
      target:
        totalExercises || 1,
    },
  ];

  return (
    <section className="space-y-5 rounded-2xl border border-gray-800 bg-gray-900/65 p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
            Régularité
          </p>

          <h3 className="mt-1 text-xl font-bold text-white">
            Série et récompenses
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatPill
            label="Série actuelle"
            value={`${currentStreak} j`}
          />
          <StatPill
            label="Meilleure série"
            value={`${bestStreak} j`}
          />
          <StatPill
            label="Jours actifs"
            value={`${activeDays}`}
          />
        </div>
      </div>

      <ActivityGrid activity={activity} />

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-white">
            Succès
          </p>

          <p className="text-xs text-gray-500">
            {
              achievements.filter(
                (item) =>
                  item.unlocked,
              ).length
            }
            /{achievements.length} débloqués
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {achievements.map(
            (achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={
                  achievement
                }
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function ActivityGrid({
  activity,
}: {
  activity: PGNTrainingActivity[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-white">
          Activité des 28 derniers jours
        </p>

        <p className="text-xs text-gray-500">
          Plus la case est claire, plus
          l’activité est forte
        </p>
      </div>

      <div className="grid grid-cols-14 gap-1.5">
        {activity.map((day) => {
          const score =
            day.started +
            day.completed * 2;

          const opacity =
            score === 0
              ? 0.12
              : Math.min(
                  0.3 + score * 0.14,
                  1,
                );

          return (
            <div
              key={day.date}
              title={`${day.date} — ${day.started} commencé(s), ${day.completed} terminé(s)`}
              className="aspect-square rounded-[4px] bg-blue-500"
              style={{
                opacity,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function AchievementCard({
  achievement,
}: {
  achievement: Achievement;
}) {
  const ratio = Math.min(
    100,
    Math.round(
      (achievement.progress /
        achievement.target) *
        100,
    ),
  );

  return (
    <article
      className={[
        "rounded-2xl border p-4 transition",
        achievement.unlocked
          ? "border-yellow-800/70 bg-yellow-950/20"
          : "border-gray-800 bg-gray-950/55",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg",
            achievement.unlocked
              ? "border-yellow-700 bg-yellow-950/50 text-yellow-300"
              : "border-gray-700 bg-gray-900 text-gray-600",
          ].join(" ")}
        >
          {achievement.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p
              className={[
                "font-bold",
                achievement.unlocked
                  ? "text-yellow-200"
                  : "text-gray-300",
              ].join(" ")}
            >
              {achievement.title}
            </p>

            {achievement.unlocked && (
              <span className="text-xs font-semibold text-yellow-300">
                Débloqué
              </span>
            )}
          </div>

          <p className="mt-1 text-xs leading-5 text-gray-500">
            {achievement.description}
          </p>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-yellow-500 transition-all"
          style={{
            width: `${ratio}%`,
          }}
        />
      </div>

      <p className="mt-2 text-right text-[11px] text-gray-600">
        {achievement.progress}/
        {achievement.target}
      </p>
    </article>
  );
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-gray-200">
        {value}
      </p>
    </div>
  );
}