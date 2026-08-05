import type {
  PGNExample,
  PGNExampleDifficulty,
} from "@/data/pgn/examples";

export type PlacementAttempt = {
  exerciseId: string;
  difficulty: PGNExampleDifficulty;
  elapsedTime: number;
  mistakes: number;
  hintsUsed: number;
};

export type PlacementResult = {
  completedAt: string;
  score: number;
  estimatedRating: number;
  levelLabel: string;
  attempts: PlacementAttempt[];
};

export type PlacementSession = {
  exerciseIds: string[];
  attempts: PlacementAttempt[];
  result: PlacementResult | null;
};

export const PLACEMENT_STORAGE_KEY = "chess-coach:placement-session";

const TARGETS: Array<{
  category: PGNExample["category"];
  difficulty: PGNExampleDifficulty;
}> = [
  { category: "opening", difficulty: "débutant" },
  { category: "middlegame", difficulty: "intermédiaire" },
  { category: "endgame", difficulty: "avancé" },
];

export function buildPlacementPlan(examples: PGNExample[]): PGNExample[] {
  const selected: PGNExample[] = [];
  for (const target of TARGETS) {
    const exact = examples.find(
      (example) =>
        example.collection !== "legend" &&
        example.category === target.category &&
        example.difficulty === target.difficulty &&
        !selected.some((item) => item.id === example.id),
    );
    const fallback = examples.find(
      (example) =>
        example.collection !== "legend" &&
        example.category === target.category &&
        !selected.some((item) => item.id === example.id),
    );
    const candidate = exact ?? fallback;
    if (candidate) selected.push(candidate);
  }
  return selected;
}

export function calculatePlacementResult(
  attempts: PlacementAttempt[],
  completedAt = new Date().toISOString(),
): PlacementResult {
  const weighted = attempts.reduce(
    (total, attempt) => {
      const weight =
        attempt.difficulty === "avancé"
          ? 1.2
          : attempt.difficulty === "intermédiaire"
            ? 1
            : 0.8;
      const timePenalty = Math.max(0, attempt.elapsedTime - 45) / 240;
      const quality = Math.max(
        0,
        1 -
          attempt.mistakes * 0.28 -
          attempt.hintsUsed * 0.14 -
          timePenalty,
      );
      return {
        score: total.score + quality * weight,
        weight: total.weight + weight,
      };
    },
    { score: 0, weight: 0 },
  );
  const score =
    weighted.weight === 0
      ? 0
      : Math.round((weighted.score / weighted.weight) * 100);
  const estimatedRating = Math.round((700 + score * 11) / 25) * 25;

  return {
    completedAt,
    score,
    estimatedRating,
    levelLabel: getPlacementLevel(estimatedRating),
    attempts,
  };
}

export function startPlacementSession(
  examples: PGNExample[],
): PlacementSession {
  return {
    exerciseIds: buildPlacementPlan(examples).map((example) => example.id),
    attempts: [],
    result: null,
  };
}

export function recordPlacementAttempt(
  session: PlacementSession,
  attempt: PlacementAttempt,
): PlacementSession {
  const attempts = [
    ...session.attempts.filter(
      (existing) => existing.exerciseId !== attempt.exerciseId,
    ),
    attempt,
  ];
  const complete = session.exerciseIds.every((id) =>
    attempts.some((item) => item.exerciseId === id),
  );
  return {
    ...session,
    attempts,
    result: complete ? calculatePlacementResult(attempts) : null,
  };
}

export function getNextPlacementExerciseId(
  session: PlacementSession,
): string | null {
  return (
    session.exerciseIds.find(
      (id) => !session.attempts.some((attempt) => attempt.exerciseId === id),
    ) ?? null
  );
}

export function readPlacementSession(): PlacementSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(PLACEMENT_STORAGE_KEY);
    if (!value) return null;
    return JSON.parse(value) as PlacementSession;
  } catch {
    return null;
  }
}

export function writePlacementSession(session: PlacementSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLACEMENT_STORAGE_KEY, JSON.stringify(session));
}

function getPlacementLevel(rating: number): string {
  if (rating < 900) return "Découverte";
  if (rating < 1_200) return "Fondations";
  if (rating < 1_500) return "En progression";
  return "Intermédiaire solide";
}
