import type {
  NoxContext,
  NoxIntent,
  NoxProvider,
  NoxReply,
} from "@/lib/nox/types";
import { NOX_CONCEPT_LABELS } from "@/lib/nox/memoryRules";

const EMPTY_REPLY: NoxReply = {
  state: "idle",
  title: "Je suis prêt quand tu l’es.",
  message:
    "Joue un coup. Je resterai près de l’échiquier pour t’aider à comprendre ce qui compte.",
};

const PIECE_ROLES: Record<string, string> = {
  pion: "Le pion avance pour gagner de l’espace et peut ouvrir le chemin aux autres pièces.",
  cavalier:
    "Le cavalier saute par-dessus les pièces et devient souvent utile près du centre, où il contrôle davantage de cases.",
  fou: "Le fou se déplace en diagonale. Il est utile quand ses diagonales sont ouvertes et qu’il regarde loin.",
  tour: "La tour se déplace en ligne droite. Elle devient puissante sur une colonne ouverte, sans pion devant elle.",
  dame: "La dame combine les déplacements de la tour et du fou. Elle est très forte, mais il faut éviter de l’exposer trop tôt.",
  roi: "Le roi doit rester en sécurité. Le roque permet souvent de l’abriter tout en activant une tour.",
};

export const deterministicNoxProvider: NoxProvider = {
  getReply(context, action = null, question = "") {
    return addRelevantMemory(
      getDeterministicNoxReply(context, action, question),
      context,
      action,
    );
  },
};

function addRelevantMemory(
  reply: NoxReply,
  context: NoxContext,
  action: NoxIntent | null,
): NoxReply {
  const memory = context.memory;
  if (!memory) return reply;
  const improving = memory.improving[0];
  if (
    improving &&
    (context.exerciseStatus === "correct" || action === "why" || action === "missed")
  ) {
    return {
      ...reply,
      message: `${reply.message} Tu te souviens ? On avait travaillé à ${NOX_CONCEPT_LABELS[improving]}. Cette fois, tu progresses vraiment.`,
    };
  }
  const weakness = memory.weaknesses[0];
  if (weakness && (action === "why" || action === "missed" || action === "plan")) {
    return {
      ...reply,
      message: `${reply.message} Ce point est revenu récemment : ${NOX_CONCEPT_LABELS[weakness]}. On va en faire un réflexe, sans te coller une étiquette.`,
    };
  }
  const strength = memory.strengths[0];
  if (strength && action === "why") {
    return {
      ...reply,
      message: `${reply.message} C’est aussi un domaine où tu deviens régulier : ${NOX_CONCEPT_LABELS[strength]}.`,
    };
  }
  return reply;
}

export function getDeterministicNoxReply(
  context: NoxContext,
  action: NoxIntent | null = null,
  question = "",
): NoxReply {
  if (context.isThinking) {
    return {
      state: "thinking",
      title: "Je regarde la position…",
      message:
        "Je vérifie les menaces et la sécurité des pièces. L’échiquier garde toute mon attention.",
    };
  }
  if (context.mode === "exercise") return getExerciseReply(context);
  if (action) return getConversationReply(context, action, question);
  if (context.review) return getReviewReaction(context);
  if (context.analysis) {
    const move = context.analysis.best_move_details;
    return {
      state: "tip",
      title: `Une idée avec ton ${move.moved_piece}`,
      message: combineMoveAndExplanation(
        move.move,
        move.move_san,
        move.moved_piece,
        move.beginner_description,
      ),
      suggestedMove: context.analysis.best_move,
      highlightedSquares: [move.from_square, move.to_square],
    };
  }
  return EMPTY_REPLY;
}

function getReviewReaction(context: NoxContext): NoxReply {
  const review = context.review!;
  const classification = review.classification;
  const isSuccess = classification === "excellent" || classification === "good";
  const lead = pickStable(
    context.contextKey,
    isSuccess
      ? ["Bien vu !", "Joli coup !", "Bonne décision !"]
      : [
          "On ralentit une seconde.",
          "Il y avait un détail caché.",
          "Regardons ce coup calmement.",
        ],
  );
  const explanation = reviewExplanation(review);
  return {
    state: isSuccess ? "success" : "warning",
    title:
      classification === "excellent"
        ? "Très joli !"
        : classification === "good"
          ? "Bonne idée."
          : classification === "blunder"
            ? "Une occasion importante était cachée."
            : classification === "mistake"
              ? "Un danger méritait un second regard."
              : "Cette position mérite qu’on s’y arrête.",
    message: `${lead} ${combineMoveAndExplanation(review.played_move, review.played_move_san, review.played_move_piece, explanation)}`,
    classification,
    classificationLabel: review.classification_label,
    suggestedMove: review.is_best_move ? review.played_move : null,
    highlightedSquares: moveSquares(review.played_move),
  };
}

function getExerciseReply(context: NoxContext): NoxReply {
  if (context.exerciseStatus === "correct" || context.exerciseStatus === "completed") {
    return {
      state: "success",
      title: "Oui ! Tu as trouvé l’idée.",
      message:
        context.primaryMessage?.trim() ||
        "Garde ce motif en tête : tu viens de le reconnaître par toi-même.",
    };
  }
  if (context.exerciseStatus === "incorrect") {
    return {
      state: "warning",
      title: "Pas encore — on regarde autrement.",
      message:
        context.exerciseHint?.trim() ||
        context.primaryMessage?.trim() ||
        "Observe les pièces qui peuvent attaquer plusieurs cibles ou rester sans protection.",
    };
  }
  return {
    state: "tip",
    title: "À toi de trouver l’idée.",
    message:
      context.primaryMessage?.trim() ||
      "Commence par les échecs, les captures et les menaces directes. Je ne soufflerai pas la réponse.",
  };
}

function getConversationReply(
  context: NoxContext,
  action: NoxIntent,
  question: string,
): NoxReply {
  const review = context.review;
  const analysis = context.analysis;
  const bestMove = review?.best_move ?? analysis?.best_move ?? null;
  const bestMoveSan = review?.best_move_san ?? analysis?.best_move_san ?? null;
  const bestPiece =
    review?.best_move_piece ?? analysis?.best_move_details.moved_piece ?? null;

  if (action === "show") {
    return bestMove
      ? {
          state: "tip",
          title: "Regarde l’échiquier.",
          message: `${describeMove(bestMove, bestMoveSan, bestPiece)} Je trace le trajet sans jouer le coup à ta place.`,
          suggestedMove: bestMove,
          highlightedSquares: moveSquares(bestMove),
        }
      : unavailableReply();
  }
  if (action === "best_move") {
    return bestMove
      ? {
          state: "tip",
          title: "Le meilleur coup vérifié",
          message: combineMoveAndExplanation(
            bestMove,
            bestMoveSan,
            bestPiece,
            analysis?.best_move_details.beginner_description ??
              (review ? reviewExplanation(review) : null) ??
              "C’est le meilleur choix fourni par l’analyse actuelle.",
          ),
          suggestedMove: bestMove,
          highlightedSquares: moveSquares(bestMove),
        }
      : unavailableReply();
  }
  if (action === "piece_help") {
    const piece = findPiece(question) ?? bestPiece;
    if (!piece || !PIECE_ROLES[piece]) return unavailableReply();
    const relevantMove =
      bestPiece === piece && bestMove
        ? bestMove
        : review?.played_move_piece === piece
          ? review.played_move
          : null;
    return {
      state: "tip",
      title: `Le rôle de ton ${piece}`,
      message: `${PIECE_ROLES[piece]}${relevantMove ? ` Ici, ${lowercaseFirst(describeMove(relevantMove, bestPiece === piece ? bestMoveSan : review?.played_move_san, piece))}` : ""}`,
      suggestedMove: relevantMove,
      highlightedSquares: relevantMove ? moveSquares(relevantMove) : [],
    };
  }
  if (action === "why") {
    const explanation = review
      ? reviewExplanation(review)
      : analysis?.best_move_details.beginner_description ||
        context.primaryMessage?.trim();
    const discussedMove = review?.played_move ?? bestMove;
    const discussedSan = review?.played_move_san ?? bestMoveSan;
    const discussedPiece = review?.played_move_piece ?? bestPiece;
    return explanation && discussedMove
      ? {
          state: "tip",
          title: "L’idée du coup",
          message: combineMoveAndExplanation(
            discussedMove,
            discussedSan,
            discussedPiece,
            explanation,
          ),
          suggestedMove: discussedMove,
          highlightedSquares: moveSquares(discussedMove),
        }
      : unavailableReply();
  }
  if (action === "plan" || action === "position_help") {
    const plan =
      analysis?.best_move_details.strategic_ideas[0] ||
      analysis?.best_move_details.explanation;
    return plan && bestMove
      ? {
          state: "tip",
          title: "Ton prochain repère",
          message: `${plan} Concrètement, ${lowercaseFirst(describeMove(bestMove, bestMoveSan, bestPiece))}`,
          suggestedMove: bestMove,
          highlightedSquares: moveSquares(bestMove),
        }
      : unavailableReply();
  }
  if (review && !review.is_best_move && bestMove) {
    return {
      state: "warning",
      title: "Ce que tu pouvais regarder",
      message: `${describeMove(bestMove, bestMoveSan, bestPiece)} ${reviewExplanation(review)}`,
      suggestedMove: bestMove,
      highlightedSquares: moveSquares(bestMove),
      classification: review.classification,
      classificationLabel: review.classification_label,
    };
  }
  if (review?.is_best_move) {
    return {
      state: "success",
      title: "Tu n’as pas raté l’idée principale.",
      message: `${describeMove(review.played_move, review.played_move_san, review.played_move_piece)} Ton coup correspond au meilleur choix vérifié dans cette position.`,
      suggestedMove: review.played_move,
      highlightedSquares: moveSquares(review.played_move),
      classification: review.classification,
      classificationLabel: review.classification_label,
    };
  }
  return unavailableReply();
}

function describeMove(
  uci: string,
  san: string | null | undefined,
  piece: string | null | undefined,
): string {
  const squares = moveSquares(uci);
  if (squares.length !== 2) return "Ce mouvement est le repère vérifié de la position.";
  const notation = san && san !== uci
    ? ` Il s’écrit ${san} dans la notation des échecs.`
    : "";
  return `Ton ${piece ?? "pièce"} part de ${squares[0]} et arrive en ${squares[1]}.${notation}`;
}

function combineMoveAndExplanation(
  uci: string,
  san: string | null | undefined,
  piece: string | null | undefined,
  explanation: string,
): string {
  const squares = moveSquares(uci);
  const normalized = explanation.toLocaleLowerCase("fr");
  const alreadyDescribesMove =
    squares.length === 2 && squares.every((square) => normalized.includes(square));
  return alreadyDescribesMove
    ? explanation
    : `${describeMove(uci, san, piece)} ${explanation}`;
}

function moveSquares(move: string): string[] {
  const normalized = move.trim().toLowerCase();
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(normalized)
    ? [normalized.slice(0, 2), normalized.slice(2, 4)]
    : [];
}

function findPiece(question: string): string | null {
  const normalized = question.toLocaleLowerCase("fr");
  return Object.keys(PIECE_ROLES).find((piece) => normalized.includes(piece)) ?? null;
}

function pickStable(key: string, variants: string[]): string {
  const total = [...key].reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  return variants[total % variants.length];
}

function lowercaseFirst(value: string): string {
  return value ? `${value[0].toLocaleLowerCase("fr")}${value.slice(1)}` : value;
}

function reviewExplanation(
  review: NonNullable<NoxContext["review"]>,
): string {
  switch (review.classification) {
    case "excellent":
      return "Ce coup correspond au meilleur choix vérifié et garde une position saine.";
    case "good":
      return "Ce coup est solide et conserve l’équilibre de ta position.";
    case "inaccuracy":
      return "Ce coup reste jouable, mais une option plus active était disponible.";
    case "mistake":
      return "Ce coup laisse une occasion à l’adversaire. Une option plus précise protégeait mieux ta position.";
    case "blunder":
      return "Ce coup laisse échapper quelque chose d’important. Cherchons d’abord la menace adverse, sans nous précipiter.";
  }
}

function unavailableReply(): NoxReply {
  return {
    state: "idle",
    title: "Je préfère attendre un fait sûr.",
    message:
      "L’analyse n’a pas encore fourni assez d’informations. Je ne vais pas inventer une réponse.",
  };
}
