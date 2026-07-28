import type {
  GuidedReviewSessionResult,
  PositionReviewResult,
} from "@/types/guidedReview";

const SESSION_HISTORY_KEY =
  "chess-coach:guided-review-history";

export function saveReviewSession(
  result: GuidedReviewSessionResult,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const history =
    getReviewSessionHistory();

  window.localStorage.setItem(
    SESSION_HISTORY_KEY,
    JSON.stringify(
      [result, ...history].slice(0, 50),
    ),
  );
}

export function getReviewSessionHistory():
  GuidedReviewSessionResult[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        SESSION_HISTORY_KEY,
      );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function buildSessionResult({
  startedAt,
  completedAt,
  positions,
}: {
  startedAt: string;
  completedAt: string;
  positions: PositionReviewResult[];
}): GuidedReviewSessionResult {
  const totalAttempts =
    positions.reduce(
      (sum, result) =>
        sum + result.attempts.length,
      0,
    );

  const solvedWithoutReveal =
    positions.filter(
      (result) =>
        result.solved &&
        !result.revealed,
    ).length;

  const revealedSolutions =
    positions.filter(
      (result) => result.revealed,
    ).length;

  return {
    startedAt,
    completedAt,
    totalPositions: positions.length,
    solvedWithoutReveal,
    revealedSolutions,
    totalAttempts,
    averageAttempts:
      positions.length === 0
        ? 0
        : Number(
            (
              totalAttempts /
              positions.length
            ).toFixed(1),
          ),
    results: positions,
  };
}
