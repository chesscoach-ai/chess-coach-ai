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
};

export type PGNDailyTrainingPlan = {
  date: string;
  estimatedMinutes: number;
  completedItems: number;
  items: PGNDailyPlanItem[];
};

function getDateKey(
  date = new Date(),
): string {
  return date.toISOString().slice(0, 10);
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
): number {
  const itemProgress =
    progress[example.id];
  let score = 0;

  if (!itemProgress) {
    score += 45;
  } else if (!itemProgress.completedAt) {
    score += 65;
  } else {
    score -= 35;
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
): string {
  const itemProgress =
    progress[example.id];

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
        ) -
        scoreExample(
          a,
          progress,
          weakestCategory,
        ),
    )
    .slice(0, targetSize);

  const items =
    selected.map(
      (example, index) => ({
        example,
        reason: getReason(
          example,
          progress,
          weakestCategory,
        ),
        priority:
          index === 0
            ? "high"
            : index === 1
              ? "medium"
              : "low",
      }),
    ) satisfies PGNDailyPlanItem[];

  return {
    date: getDateKey(),
    estimatedMinutes: items.reduce(
      (sum, item) =>
        sum +
        getPGNExampleMetrics(
          item.example,
        ).estimatedMinutes,
      0,
    ),
    completedItems: items.filter(
      (item) =>
        Boolean(
          progress[item.example.id]
            ?.completedAt,
        ),
    ).length,
    items,
  };
}