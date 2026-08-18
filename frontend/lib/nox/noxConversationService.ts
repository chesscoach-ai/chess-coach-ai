import type {
  NoxContext,
  NoxIntent,
  NoxProvider,
  NoxQuickAction,
  NoxReply,
} from "@/lib/nox/types";

export type NoxQuickActionOption = {
  id: NoxQuickAction;
  label: string;
};

export type NoxRoutedQuestion = {
  intent: NoxIntent | null;
  confidence: "high" | "low";
};

const UNKNOWN_REPLY: NoxReply = {
  state: "idle",
  title: "Je préfère être honnête.",
  message:
    "Je ne sais pas encore répondre précisément à cette question. Pour l’instant, je peux t’expliquer le meilleur coup, ton plan ou ce que tu as raté.",
};

function normalizeQuestion(question: string): string {
  return question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

export function routeNoxQuestion(question: string): NoxRoutedQuestion {
  const normalized = normalizeQuestion(question);
  if (!normalized) return { intent: null, confidence: "low" };

  if (containsAny(normalized, ["montre", "affiche", "fleche", "trajet"])) {
    return { intent: "show", confidence: "high" };
  }
  if (containsAny(normalized, ["meilleur coup", "quoi jouer", "quel coup jouer"])) {
    return { intent: "best_move", confidence: "high" };
  }
  if (containsAny(normalized, ["rate", "ratee", "pas vu", "menace", "manque"])) {
    return { intent: "missed", confidence: "high" };
  }
  if (containsAny(normalized, ["quel plan", "mon plan", "maintenant", "prochaine etape"])) {
    return { intent: "plan", confidence: "high" };
  }
  if (
    containsAny(normalized, ["pion", "cavalier", "fou", "tour", "dame", "roi"]) &&
    containsAny(normalized, ["utile", "sert", "role", "piece", "bouge"])
  ) {
    return { intent: "piece_help", confidence: "high" };
  }
  if (containsAny(normalized, ["position", "que faire", "comment jouer"])) {
    return { intent: "position_help", confidence: "high" };
  }
  if (containsAny(normalized, ["pourquoi", "explique", "ce coup"])) {
    return { intent: "why", confidence: "high" };
  }
  return { intent: null, confidence: "low" };
}

export function getContextualQuickActions(
  context: NoxContext,
): NoxQuickActionOption[] {
  if (context.mode === "exercise") return [];
  const review = context.review;
  const analysis = context.analysis;
  const options: NoxQuickActionOption[] = [];
  const isError = ["inaccuracy", "mistake", "blunder"].includes(
    review?.classification ?? "",
  );
  const isStrong = ["excellent", "good"].includes(
    review?.classification ?? "",
  );

  if (context.primaryMessage || review?.explanation || analysis) {
    options.push({
      id: "why",
      label: isError
        ? "Pourquoi c’est une erreur ?"
        : isStrong
          ? "Pourquoi ce coup est fort ?"
          : "Pourquoi ce coup ?",
    });
  }
  if (review && !review.is_best_move) {
    options.push({ id: "missed", label: "Qu’est-ce que je n’ai pas vu ?" });
  }
  if (analysis?.best_move_details.strategic_ideas.length) {
    options.push({
      id: "plan",
      label: isStrong ? "Et maintenant ?" : "Quel est mon plan ?",
    });
  }
  if (review?.best_move || analysis?.best_move) {
    options.push({
      id: "show",
      label: isError ? "Montre-moi la meilleure idée" : "Montre-moi",
    });
  }
  return options;
}

export class NoxConversationService {
  constructor(private readonly provider: NoxProvider) {}

  react(context: NoxContext): NoxReply {
    return this.provider.getReply(context, null);
  }

  askQuickAction(context: NoxContext, action: NoxQuickAction): NoxReply {
    return this.provider.getReply(context, action);
  }

  askQuestion(
    context: NoxContext,
    question: string,
  ): { route: NoxRoutedQuestion; reply: NoxReply } {
    const route = routeNoxQuestion(question);
    if (!route.intent || route.confidence !== "high") {
      return { route, reply: UNKNOWN_REPLY };
    }
    return {
      route,
      reply: this.provider.getReply(context, route.intent, question),
    };
  }
}
