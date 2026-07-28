import type {
  CriticalPosition,
  MoveClassification,
  ReviewTheme,
} from "@/types/guidedReview";

export type AnalysisMoveLike = {
  ply?: number;
  move_number?: number;
  moveNumber?: number;
  fen_before?: string;
  fenBefore?: string;
  side_to_move?: "white" | "black";
  sideToMove?: "white" | "black";

  played_move_uci?: string;
  playedMoveUci?: string;
  played_move_san?: string;
  playedMoveSan?: string;

  best_move_uci?: string;
  bestMoveUci?: string;
  best_move_san?: string;
  bestMoveSan?: string;

  principal_variation_uci?: string[];
  principalVariationUci?: string[];
  principal_variation_san?: string[];
  principalVariationSan?: string[];

  evaluation_before_cp?: number;
  evaluationBeforeCp?: number;
  evaluation_after_cp?: number;
  evaluationAfterCp?: number;
  evaluation_loss_cp?: number;
  evaluationLossCp?: number;

  classification?: string;
  theme?: string;
  explanation?: string;
  hint?: string;
};

const ACCEPTED_CLASSIFICATIONS = new Set([
  "inaccuracy",
  "mistake",
  "blunder",
]);

export function buildCriticalPositions(
  moves: AnalysisMoveLike[],
  options?: {
    minimumLossCp?: number;
    classifications?: MoveClassification[];
  },
): CriticalPosition[] {
  const minimumLossCp =
    options?.minimumLossCp ?? 80;
  const classifications = new Set(
    options?.classifications ?? [
      "mistake",
      "blunder",
    ],
  );

  return moves
    .map(normalizeMove)
    .filter(
      (
        position,
      ): position is CriticalPosition =>
        position !== null,
    )
    .filter(
      (position) =>
        classifications.has(
          position.classification,
        ) &&
        position.evaluationLossCp >=
          minimumLossCp,
    )
    .sort(
      (a, b) =>
        b.evaluationLossCp -
        a.evaluationLossCp,
    );
}

function normalizeMove(
  move: AnalysisMoveLike,
): CriticalPosition | null {
  const fen =
    move.fenBefore ??
    move.fen_before;
  const playedMoveUci =
    move.playedMoveUci ??
    move.played_move_uci;
  const bestMoveUci =
    move.bestMoveUci ??
    move.best_move_uci;

  if (
    !fen ||
    !playedMoveUci ||
    !bestMoveUci
  ) {
    return null;
  }

  const rawClassification =
    move.classification ??
    "mistake";

  const classification =
    ACCEPTED_CLASSIFICATIONS.has(
      rawClassification,
    )
      ? (rawClassification as MoveClassification)
      : "mistake";

  const ply =
    move.ply ??
    Math.max(
      1,
      ((move.moveNumber ??
        move.move_number ??
        1) -
        1) *
        2 +
        1,
    );

  const moveNumber =
    move.moveNumber ??
    move.move_number ??
    Math.ceil(ply / 2);

  const evaluationBeforeCp =
    move.evaluationBeforeCp ??
    move.evaluation_before_cp;
  const evaluationAfterCp =
    move.evaluationAfterCp ??
    move.evaluation_after_cp;

  const evaluationLossCp =
    move.evaluationLossCp ??
    move.evaluation_loss_cp ??
    Math.abs(
      (evaluationBeforeCp ?? 0) -
        (evaluationAfterCp ?? 0),
    );

  return {
    id: `${ply}-${playedMoveUci}-${bestMoveUci}`,
    ply,
    moveNumber,
    sideToMove:
      move.sideToMove ??
      move.side_to_move ??
      inferSideToMove(fen),
    fen,
    playedMoveUci,
    playedMoveSan:
      move.playedMoveSan ??
      move.played_move_san,
    bestMoveUci,
    bestMoveSan:
      move.bestMoveSan ??
      move.best_move_san,
    principalVariationUci:
      move.principalVariationUci ??
      move.principal_variation_uci,
    principalVariationSan:
      move.principalVariationSan ??
      move.principal_variation_san,
    evaluationBeforeCp,
    evaluationAfterCp,
    evaluationLossCp,
    classification,
    theme: normalizeTheme(move.theme),
    explanation: move.explanation,
    hint: move.hint,
  };
}

function inferSideToMove(
  fen: string,
): "white" | "black" {
  return fen.split(" ")[1] === "b"
    ? "black"
    : "white";
}

function normalizeTheme(
  value?: string,
): ReviewTheme | undefined {
  const accepted: ReviewTheme[] = [
    "tactic",
    "material",
    "king-safety",
    "development",
    "initiative",
    "endgame",
    "calculation",
    "other",
  ];

  return accepted.includes(
    value as ReviewTheme,
  )
    ? (value as ReviewTheme)
    : value
      ? "other"
      : undefined;
}
