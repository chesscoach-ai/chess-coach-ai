import type {
  PGNExample,
  PGNExampleCategory,
} from "@/data/pgn/examples";
import type { PGNExerciseProgress } from "@/lib/pgnExerciseProgress";
import { getPGNExampleMetrics } from "@/lib/pgnExampleMetrics";

export type PGNDailyPlanItem = {
  example: PGNExample;
  reason: string;
  priority: "high" | "medium" | "low";
  kind: "review" | "new";
  dueAt: string | null;
};

export type PGNDailyTrainingPlan = {
  date: string;
  estimatedMinutes: number;
  completedItems: number;
  dueItems: number;
  items: PGNDailyPlanItem[];
};

function getDateKey(
  date = new Date(),
): string {
  return date.toISOString().slice(0, 10);
}

export function getSpacedReviewState(
  progress: PGNExerciseProgress | undefined,
  today = new Date(),
): {
  due: boolean;
  dueAt: string | null;
  intervalDays: number;
} {
  if (!progress?.completedAt) {
    return { due: false, dueAt: null, intervalDays: 0 };
  }
  const repetitions = Math.max(1, progress.successfulRepetitions ?? 1);
  const intervalDays = progress.needsReview
    ? 0
    : repetitions === 1
      ? 3
      : repetitions === 2
        ? 7
        : repetitions === 3
          ? 14
          : 30;
  const dueDate = new Date(progress.completedAt);
  dueDate.setDate(dueDate.getDate() + intervalDays);
  return {
    due: dueDate.getTime() <= today.getTime(),
    dueAt: getDateKey(dueDate),
    intervalDays,
  };
}

function getCategoryCount(
  examples: PGNExample[],
  progress: Record<
    string,
    PGNExerciseProgress
  >,
  category: PGNExampleCategory,
): number {
  return examples.filter(
    (example) =>
      example.category === category &&
      progress[example.id]?.completedAt,
  ).length;
}

function scoreExample(
  example: PGNExample,
  progress: Record<
    string,
    PGNExerciseProgress
  >,
  weakestCategory: PGNExampleCategory,
  today: Date,
): number {
  const itemProgress =
    progress[example.id];
  let score = 0;

  if (!itemProgress) {
    score += 45;
  } else if (!itemProgress.completedAt) {
    score += 65;
  } else {
    const review = getSpacedReviewState(itemProgress, today);
    score += review.due ? (itemProgress.needsReview ? 150 : 105) : -35;
  }

  if (
    example.category ===
    weakestCategory
  ) {
    score += 30;
  }

  if (
    example.difficulty ===
    "débutant"
  ) {
    score += 8;
  } else if (
    example.difficulty ===
    "intermédiaire"
  ) {
    score += 12;
  } else {
    score += 5;
  }

  const metrics =
    getPGNExampleMetrics(example);

  if (
    metrics.estimatedMinutes <= 7
  ) {
    score += 8;
  }

  score +=
    Math.abs(
      hashString(
        `${getDateKey()}-${example.id}`,
      ),
    ) % 11;

  return score;
}

function hashString(
  value: string,
): number {
  let hash = 0;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash =
      (hash * 31 +
        value.charCodeAt(index)) |
      0;
  }

  return hash;
}

function getReason(
  example: PGNExample,
  progress: Record<
    string,
    PGNExerciseProgress
  >,
  weakestCategory: PGNExampleCategory,
  today: Date,
): string {
  const itemProgress =
    progress[example.id];

  if (itemProgress?.completedAt) {
    const review = getSpacedReviewState(itemProgress, today);
    if (itemProgress.needsReview) {
      return "À revoir maintenant : une erreur ou plusieurs indices ont fragilisé ce réflexe.";
    }
    if (review.due) {
      return `Révision espacée après ${review.intervalDays} jours pour vérifier que le réflexe tient toujours.`;
    }
  }

  if (
    itemProgress &&
    !itemProgress.completedAt
  ) {
    return "Reprendre un exercice déjà commencé pour consolider l’apprentissage.";
  }

  if (
    example.category ===
    weakestCategory
  ) {
    return "Renforcer la catégorie actuellement la moins travaillée.";
  }

  if (
    example.difficulty ===
    "intermédiaire"
  ) {
    return "Maintenir une difficulté progressive et régulière.";
  }

  return "Varier les thèmes pour construire un entraînement équilibré.";
}

export function buildDailyTrainingPlan(
  examples: PGNExample[],
  progress: Record<
    string,
    PGNExerciseProgress
  >,
  targetSize = 3,
  today = new Date(),
): PGNDailyTrainingPlan {
  const categories: PGNExampleCategory[] =
    [
      "opening",
      "middlegame",
      "endgame",
    ];

  const weakestCategory =
    categories
      .map((category) => ({
        category,
        completed:
          getCategoryCount(
            examples,
            progress,
            category,
          ),
      }))
      .sort(
        (a, b) =>
          a.completed -
          b.completed,
      )[0]?.category ??
    "opening";

  const selected = [...examples]
    .sort(
      (a, b) =>
        scoreExample(
          b,
          progress,
          weakestCategory,
          today,
        ) -
        scoreExample(
          a,
          progress,
          weakestCategory,
          today,
        ),
    )
    .slice(0, targetSize);

  const items =
    selected.map(
      (example, index) => {
        const review = getSpacedReviewState(progress[example.id], today);
        return {
        example,
        reason: getReason(
          example,
          progress,
          weakestCategory,
          today,
        ),
        priority:
          index === 0
            ? "high"
            : index === 1
              ? "medium"
              : "low",
        kind: review.due ? "review" : "new",
        dueAt: review.dueAt,
      };
      },
    ) satisfies PGNDailyPlanItem[];

  return {
    date: getDateKey(today),
    estimatedMinutes: Math.max(3, items.length * 2),
    completedItems: items.filter(
      (item) =>
        progress[item.example.id]?.completedAt?.startsWith(getDateKey(today)),
    ).length,
    dueItems: items.filter((item) => item.kind === "review").length,
    items,
  };
}
