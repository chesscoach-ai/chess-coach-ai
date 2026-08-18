import type {
  NoxContext,
  NoxPlayerLevel,
  NoxQuickAction,
  ServerNoxContext,
  ServerNoxMove,
} from "@/lib/nox/types";

const HEURISTIC_IDS: Record<string, string> = {
  "Met le roi à l’abri et connecte les tours.": "king_safety",
  "Force l’adversaire à répondre à l’échec.": "forcing_check",
  "Modifie immédiatement l’équilibre matériel.": "material_change",
  "Transforme un pion en une pièce plus puissante.": "promotion",
  "Renforce le contrôle du centre.": "center_control",
  "Développe une pièce mineure vers une case active.":
    "minor_piece_development",
  "Améliore la coordination ou le placement des pièces.":
    "piece_coordination",
};

function squares(uci: string): [string, string] | null {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)
    ? [uci.slice(0, 2), uci.slice(2, 4)]
    : null;
}

function opposite(color: "white" | "black"): "white" | "black" {
  return color === "white" ? "black" : "white";
}

function sideToMove(contextKey: string): "white" | "black" {
  return contextKey.split(" ")[1] === "b" ? "black" : "white";
}

export function buildServerNoxContext(
  context: NoxContext,
  action: NoxQuickAction | null,
  playerLevel: NoxPlayerLevel = "beginner",
): ServerNoxContext | null {
  if (context.mode !== "analysis") return null;
  const currentSide = sideToMove(context.contextKey);
  const review = context.review;
  const analysis = context.analysis;
  const playedSquares = review ? squares(review.played_move) : null;
  const bestUci = review?.best_move ?? analysis?.best_move ?? null;
  const bestSquares = bestUci ? squares(bestUci) : null;

  const playedMove: ServerNoxMove | null =
    review && playedSquares
      ? {
          uci: review.played_move,
          san: review.played_move_san,
          piece: review.played_move_piece,
          piece_color: opposite(currentSide),
          from_square: playedSquares[0],
          to_square: playedSquares[1],
        }
      : null;
  const details = analysis?.best_move_details;
  const bestMove: ServerNoxMove | null =
    bestUci && bestSquares
      ? {
          uci: bestUci,
          san: review?.best_move_san ?? analysis?.best_move_san ?? bestUci,
          piece:
            review?.best_move_piece ?? details?.moved_piece ?? "pièce",
          piece_color: review
            ? opposite(currentSide)
            : (details?.moved_piece_color ?? currentSide),
          from_square: bestSquares[0],
          to_square: bestSquares[1],
        }
      : null;

  if (!playedMove && !bestMove) return null;
  return {
    schema_version: "1.0",
    language: "fr",
    player_level: playerLevel,
    interaction: {
      depth: action ? "explanation" : "reaction",
      question: action ?? "reaction",
    },
    position: { side_to_move: currentSide },
    played_move: playedMove,
    classification: review
      ? {
          code: review.classification,
          evaluation_loss: Math.max(0, review.evaluation_loss),
        }
      : null,
    best_move: bestMove,
    evaluation: review
      ? {
          before: review.evaluation_before,
          after: review.evaluation_after,
          type: review.evaluation_before_type,
        }
      : details
        ? {
            before: details.evaluation,
            after: details.evaluation,
            type: details.evaluation_type,
          }
        : null,
    facts: {
      capture: review?.played_move_is_capture ?? details?.is_capture ?? false,
      check: review?.played_move_gives_check ?? details?.gives_check ?? false,
      checkmate: review ? false : (details?.gives_checkmate ?? false),
      castle: review?.played_move_is_castling ?? details?.is_castling ?? false,
      promotion:
        review?.played_move_is_promotion ?? details?.is_promotion ?? false,
    },
    heuristics: (review ? [] : (details?.strategic_ideas ?? []))
      .slice(0, 8)
      .map((idea) => ({
      id: HEURISTIC_IDS[idea] ?? "other",
      source: "deterministic_rules" as const,
      })),
    ...(context.memory ? { memory: context.memory } : {}),
  };
}

export function isNoxAiEligible(
  context: NoxContext,
  action: NoxQuickAction | null,
): boolean {
  if (context.mode !== "analysis" || action === "show") return false;
  if (action === "why" || action === "plan" || action === "missed") {
    return true;
  }
  return ["excellent", "mistake", "blunder"].includes(
    context.review?.classification ?? "",
  );
}
