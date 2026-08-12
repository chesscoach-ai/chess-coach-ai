import type {
  NoxContext,
  NoxProvider,
  NoxQuickAction,
  NoxReply,
} from "@/lib/nox/types";

const EMPTY_REPLY: NoxReply = {
  state: "idle",
  title: "Je suis prêt quand tu l’es.",
  message:
    "Joue un coup. Je resterai près de l’échiquier pour t’aider à comprendre ce qui compte.",
};

export const deterministicNoxProvider: NoxProvider = {
  getReply(context, action = null) {
    return getDeterministicNoxReply(context, action);
  },
};

export function getDeterministicNoxReply(
  context: NoxContext,
  action: NoxQuickAction | null = null,
): NoxReply {
  if (context.isThinking) {
    return {
      state: "thinking",
      title: "Je regarde la position…",
      message:
        "Je vérifie les menaces et la sécurité des pièces. L’échiquier garde toute mon attention.",
    };
  }

  if (context.mode === "exercise") {
    return getExerciseReply(context);
  }

  if (action) {
    return getConversationReply(context, action);
  }

  if (context.review) {
    const classification = context.review.classification;
    const isSuccess =
      classification === "excellent" ||
      classification === "good";
    const isWarning =
      classification === "mistake" ||
      classification === "blunder" ||
      classification === "inaccuracy";

    return {
      state: isSuccess ? "success" : isWarning ? "warning" : "tip",
      title:
        classification === "excellent"
          ? "Très joli !"
          : classification === "good"
            ? "Bonne idée."
            : classification === "blunder"
              ? "Il y avait une vraie opportunité cachée."
              : classification === "mistake"
                ? "Un danger méritait un second regard."
                : "Cette position mérite qu’on s’y arrête.",
      message:
        context.primaryMessage?.trim() ||
        "Regardons ensemble la conséquence la plus importante de ce coup.",
      classification,
      classificationLabel: context.review.classification_label,
      suggestedMove: context.review.best_move,
    };
  }

  if (context.analysis) {
    const move = context.analysis.best_move_details;
    return {
      state: "tip",
      title: `Une idée avec ton ${move.moved_piece}`,
      message:
        context.primaryMessage?.trim() ||
        move.beginner_description,
      suggestedMove: context.analysis.best_move,
    };
  }

  return EMPTY_REPLY;
}

function getExerciseReply(context: NoxContext): NoxReply {
  if (
    context.exerciseStatus === "correct" ||
    context.exerciseStatus === "completed"
  ) {
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
  action: NoxQuickAction,
): NoxReply {
  const review = context.review;
  const analysis = context.analysis;
  const bestMove = review?.best_move ?? analysis?.best_move ?? null;
  const bestMoveSan =
    review?.best_move_san ?? analysis?.best_move_san ?? null;
  const bestPiece =
    review?.best_move_piece ??
    analysis?.best_move_details.moved_piece ??
    null;

  if (action === "show") {
    return bestMove
      ? {
          state: "tip",
          title: "Regarde l’échiquier.",
          message: `Je te montre le trajet du ${bestPiece ?? "coup"}${bestMoveSan ? ` pour jouer ${bestMoveSan}` : ""}, sans le jouer à ta place.`,
          suggestedMove: bestMove,
        }
      : unavailableReply();
  }

  if (action === "why") {
    const explanation =
      context.primaryMessage?.trim() ||
      analysis?.best_move_details.beginner_description ||
      review?.explanation;
    return explanation
      ? {
          state: "tip",
          title: "Pourquoi ce coup ?",
          message: explanation,
          suggestedMove: bestMove,
        }
      : unavailableReply();
  }

  if (action === "plan") {
    const plan =
      analysis?.best_move_details.strategic_ideas[0] ||
      analysis?.best_move_details.explanation;
    return plan
      ? {
          state: "tip",
          title: "Ton plan maintenant",
          message: plan,
          suggestedMove: bestMove,
        }
      : {
          state: "idle",
          title: "J’ai besoin d’une position analysée.",
          message:
            "Joue un coup ou attends la fin de l’analyse ; je pourrai alors m’appuyer sur un fait vérifié.",
        };
  }

  if (review && !review.is_best_move) {
    return {
      state: "warning",
      title: "Ce que tu pouvais regarder",
      message: `Le ${bestPiece ?? "meilleur coup"} pouvait jouer ${bestMoveSan ?? bestMove}. ${review.explanation}`,
      suggestedMove: bestMove,
      classification: review.classification,
      classificationLabel: review.classification_label,
    };
  }

  if (review?.is_best_move) {
    return {
      state: "success",
      title: "Tu n’as pas raté l’idée principale.",
      message:
        context.primaryMessage?.trim() ||
        "Ton coup correspond au meilleur choix vérifié dans cette position.",
      suggestedMove: review.best_move,
      classification: review.classification,
      classificationLabel: review.classification_label,
    };
  }

  return unavailableReply();
}

function unavailableReply(): NoxReply {
  return {
    state: "idle",
    title: "Je préfère attendre un fait sûr.",
    message:
      "L’analyse n’a pas encore fourni assez d’informations. Je ne vais pas inventer une réponse.",
  };
}
