"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ApiService,
  type MoveAnalysis,
  type PositionAnalysisResponse,
} from "@/services/api/ApiService";
import {
  getAiPersona,
  type AiPersonaId,
} from "@/lib/ai/opponents";

type AnalysisPanelProps = {
  fen: string;
  autoAnalyse?: boolean;
  onAnalysisComplete?: (
    analysis: PositionAnalysisResponse,
  ) => void;
  onLoadingChange?: (
    isLoading: boolean,
  ) => void;
  coachPersonaId?: AiPersonaId;
  showTermExplanations?: boolean;
};

type EvaluationData = Pick<
  PositionAnalysisResponse,
  "evaluation" | "evaluation_type"
>;

type ChessTerm = {
  term: string;
  explanation: string;
  aliases?: string[];
};

const CHESS_GLOSSARY: ChessTerm[] = [
  {
    term: "Notation",
    explanation:
      "écriture courte utilisée pour enregistrer un coup, par exemple Cf3 pour un cavalier allant en f3.",
    aliases: ["notation", "san"],
  },
  {
    term: "Capture",
    explanation:
      "coup qui retire une pièce adverse de l’échiquier.",
    aliases: ["capture", "capturer", "prise"],
  },
  {
    term: "Échec",
    explanation:
      "attaque directe contre le roi ; le joueur doit immédiatement protéger ou déplacer son roi.",
    aliases: ["échec"],
  },
  {
    term: "Échec et mat",
    explanation:
      "le roi est attaqué et aucun coup légal ne peut le sauver : la partie est terminée.",
    aliases: ["échec et mat", "mat"],
  },
  {
    term: "Roque",
    explanation:
      "coup spécial qui déplace en même temps le roi et une tour pour mettre le roi à l’abri.",
    aliases: ["roque", "roquer"],
  },
  {
    term: "Promotion",
    explanation:
      "transformation d’un pion arrivé au bout de l’échiquier, le plus souvent en dame.",
    aliases: ["promotion", "promouvoir"],
  },
  {
    term: "Variante",
    explanation:
      "suite de coups que le moteur considère comme la meilleure continuation probable.",
    aliases: ["variante", "suite envisagée", "principal variation"],
  },
  {
    term: "Évaluation",
    explanation:
      "estimation de la position : un nombre positif favorise les Blancs, un nombre négatif favorise les Noirs.",
    aliases: ["évaluation"],
  },
  {
    term: "Profondeur",
    explanation:
      "nombre d’étapes de calcul explorées par le moteur ; une valeur plus élevée signifie généralement une analyse plus poussée.",
    aliases: ["profondeur"],
  },
  {
    term: "Avantage positionnel",
    explanation:
      "camp dont la position semble la plus favorable, même sans gain immédiat de pièce.",
    aliases: ["avantage positionnel", "positionnel"],
  },
  {
    term: "Développement",
    explanation:
      "action de sortir ses pièces de leur case de départ pour les rendre actives.",
    aliases: ["développement", "développer"],
  },
  {
    term: "Centre",
    explanation:
      "cases centrales de l’échiquier, importantes pour donner de l’espace et de la mobilité aux pièces.",
    aliases: ["centre", "central"],
  },
  {
    term: "Initiative",
    explanation:
      "capacité à imposer des menaces auxquelles l’adversaire doit répondre.",
    aliases: ["initiative"],
  },
  {
    term: "Tempo",
    explanation:
      "un temps de jeu, c’est-à-dire un coup utilisé pour réaliser une action.",
    aliases: ["tempo"],
  },
  {
    term: "Matériel",
    explanation:
      "ensemble des pièces et des pions encore présents pour chaque joueur.",
    aliases: ["matériel"],
  },
  {
    term: "Tactique",
    explanation:
      "courte combinaison de coups qui exploite une menace immédiate.",
    aliases: ["tactique"],
  },
  {
    term: "Fourchette",
    explanation:
      "attaque simultanée de deux pièces adverses par une seule pièce.",
    aliases: ["fourchette"],
  },
  {
    term: "Clouage",
    explanation:
      "situation où une pièce ne peut pas bouger sans exposer une pièce plus importante derrière elle.",
    aliases: ["clouage", "cloué", "clouée"],
  },
  {
    term: "Colonne ouverte",
    explanation:
      "colonne sans pion, souvent utile aux tours pour attaquer.",
    aliases: ["colonne ouverte"],
  },
  {
    term: "Structure de pions",
    explanation:
      "façon dont les pions sont placés et se protègent les uns les autres.",
    aliases: ["structure de pions", "structure"],
  },
];

export default function AnalysisPanel({
  fen,
  autoAnalyse = true,
  onAnalysisComplete,
  onLoadingChange,
  coachPersonaId = "balanced",
  showTermExplanations = true,
}: AnalysisPanelProps) {
  const [analysis, setAnalysis] =
    useState<PositionAnalysisResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const requestIdRef = useRef(0);

  const whiteAdvantagePercentage = useMemo(() => {
    if (!analysis) {
      return 50;
    }

    return getWhiteAdvantagePercentage(analysis);
  }, [analysis]);

  const handleAnalysis = useCallback(async (): Promise<void> => {
    if (!fen.trim()) {
      setErrorMessage("Aucune position à analyser.");
      return;
    }

    const requestId =
      requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setIsLoading(true);
    onLoadingChange?.(true);
    setErrorMessage(null);

    try {
      const result = await ApiService.analysePosition({
        fen,
        depth: 15,
        multipv: 3,
      });

      if (
        requestId !==
        requestIdRef.current
      ) {
        return;
      }

      setAnalysis(result);
      onAnalysisComplete?.(result);
    } catch (error) {
      if (
        requestId !==
        requestIdRef.current
      ) {
        return;
      }

      setAnalysis(null);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Une erreur inconnue est survenue pendant l’analyse.",
        );
      }
    } finally {
      if (
        requestId ===
        requestIdRef.current
      ) {
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    }
  }, [fen, onAnalysisComplete, onLoadingChange]);

  useEffect(() => {
    if (!autoAnalyse || !fen.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleAnalysis();
    }, 350);

    return () => {
      window.clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [fen, autoAnalyse, handleAnalysis]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
      <PanelHeader
        isLoading={isLoading}
        onRefresh={() => {
          void handleAnalysis();
        }}
      />

      {errorMessage && (
        <ErrorMessage message={errorMessage} />
      )}

      {analysis && (
        <div className="mt-3 space-y-3">
          <CompactAnalysisSummary
            analysis={analysis}
          />

          <details className="group rounded-xl border border-gray-800 bg-gray-950/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-gray-200">
              Déplier l’analyse complète
              <span className="text-blue-300 transition group-open:rotate-180">
                ⌄
              </span>
            </summary>
            <div className="space-y-4 border-t border-gray-800 p-4">
              <BestMoveCard
                analysis={analysis}
                coachPersonaId={coachPersonaId}
                showTermExplanations={showTermExplanations}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatCard
                  label="Évaluation"
                  value={formatEvaluation(analysis)}
                  explanation={getTermExplanation("Évaluation")}
                  showExplanation={showTermExplanations}
                />

                <StatCard
                  label="Profondeur"
                  value={String(analysis.depth)}
                  explanation={getTermExplanation("Profondeur")}
                  showExplanation={showTermExplanations}
                />
              </div>

              <EvaluationBar
                evaluation={analysis}
                whitePercentage={whiteAdvantagePercentage}
                showExplanation={showTermExplanations}
              />

              <TopMovesSection
                topMoves={analysis.top_moves}
                showTermExplanations={showTermExplanations}
              />
            </div>
          </details>
        </div>
      )}
    </section>
  );
}

function PanelHeader({
  isLoading,
  onRefresh,
}: {
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Analyse Stockfish
        </h2>

        <p className="mt-1 text-sm leading-6 text-gray-400">
          Les idées essentielles de la position, expliquées sans
          surcharge.
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className="shrink-0 rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-gray-800 disabled:opacity-40"
      >
        {isLoading ? "Calcul…" : "Actualiser"}
      </button>
    </div>
  );
}

function CompactAnalysisSummary({
  analysis,
}: {
  analysis: PositionAnalysisResponse;
}) {
  const move =
    analysis.best_move_details;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-900/60 bg-blue-950/20 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-300">
          Meilleur coup
        </p>
        <p className="mt-0.5 truncate text-base font-black text-white">
          {move.move_san}{" "}
          <span className="font-medium text-gray-400">
            · {move.beginner_label}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full border border-gray-700 px-2.5 py-1 text-gray-300">
          Éval. {formatEvaluation(analysis)}
        </span>
        <span className="rounded-full border border-gray-700 px-2.5 py-1 text-gray-500">
          Prof. {analysis.depth}
        </span>
      </div>
    </div>
  );
}

function ErrorMessage({
  message,
}: {
  message: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-4">
      <p className="text-sm font-medium text-red-300">
        {message}
      </p>
    </div>
  );
}

function BestMoveCard({
  analysis,
  coachPersonaId,
  showTermExplanations,
}: {
  analysis: PositionAnalysisResponse;
  coachPersonaId: AiPersonaId;
  showTermExplanations: boolean;
}) {
  const move = analysis.best_move_details;
  const persona = getAiPersona(coachPersonaId);

  return (
    <div className="rounded-xl border border-blue-900/70 bg-blue-950/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-blue-300">
        Le meilleur coup, expliqué simplement
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xl font-bold leading-8 text-white sm:text-2xl">
            {move.beginner_label}
          </p>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <MoveBadge>
              Notation : {move.move_san}
            </MoveBadge>

            <MoveBadge>
              De {move.from_square} vers {move.to_square}
            </MoveBadge>

            {move.is_capture && (
              <MoveBadge>
                Capture
                {move.captured_piece
                  ? ` : ${move.captured_piece}`
                  : ""}
              </MoveBadge>
            )}

            {move.gives_checkmate ? (
              <MoveBadge>Échec et mat</MoveBadge>
            ) : (
              move.gives_check && (
                <MoveBadge>Échec</MoveBadge>
              )
            )}

            {move.is_castling && (
              <MoveBadge>Roque</MoveBadge>
            )}

            {move.is_promotion && (
              <MoveBadge>
                Promotion
                {move.promotion_piece
                  ? ` en ${move.promotion_piece}`
                  : ""}
              </MoveBadge>
            )}
          </div>

          <TermExplanations
            enabled={showTermExplanations}
            texts={[
              "Notation",
              move.is_capture ? "Capture" : "",
              move.gives_checkmate
                ? "Échec et mat"
                : move.gives_check
                  ? "Échec"
                  : "",
              move.is_castling ? "Roque" : "",
              move.is_promotion ? "Promotion" : "",
            ]}
          />
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Évaluation
          </p>

          <p className="mt-1 text-lg font-semibold text-white">
            {formatEvaluation(analysis)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t border-blue-900/50 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Que se passe-t-il ?
          </p>

          <p className="mt-1 text-sm leading-6 text-gray-200">
            {move.beginner_description}
          </p>
        </div>

        {move.strategic_ideas.length > 0 && (
          <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Pourquoi ce coup est intéressant ?
            </p>

            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-emerald-100/90">
              {move.strategic_ideas.map((idea, index) => (
                <li
                  key={`${idea}-${index}`}
                  className="flex gap-2"
                >
                  <span aria-hidden="true">•</span>
                  <span>{idea}</span>
                </li>
              ))}
            </ul>

            <TermExplanations
              enabled={showTermExplanations}
              texts={move.strategic_ideas}
            />
          </div>
        )}

        <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {persona.name} te conseille
          </p>

          <p className="mt-1 text-sm leading-6 text-gray-300">
            {getPersonaCoachLead(coachPersonaId)} {move.explanation}
          </p>

          <TermExplanations
            enabled={showTermExplanations}
            texts={[move.explanation]}
          />
        </div>
      </div>
    </div>
  );
}

function MoveBadge({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-gray-300">
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  explanation,
  showExplanation,
}: {
  label: string;
  value: string;
  explanation: string;
  showExplanation: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-white">
        {value}
      </p>

      {showExplanation && (
        <p className="mt-2 text-xs leading-5 text-gray-400">
          {explanation}
        </p>
      )}
    </div>
  );
}

function EvaluationBar({
  evaluation,
  whitePercentage,
  showExplanation,
}: {
  evaluation: EvaluationData;
  whitePercentage: number;
  showExplanation: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Avantage positionnel
        </p>

        <p className="text-sm font-semibold text-white">
          {formatEvaluation(evaluation)}
        </p>
      </div>

      {showExplanation && (
        <p className="mt-2 text-xs leading-5 text-gray-400">
          Indique quel camp semble mieux placé. Une valeur
          positive favorise les Blancs, une valeur négative les
          Noirs ; environ 0 signifie que la position est
          équilibrée.
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-full border border-gray-700">
        <div className="relative flex h-6 w-full bg-gray-950">
          <div
            className="h-full bg-white transition-[width] duration-700 ease-out"
            style={{
              width: `${whitePercentage}%`,
            }}
          />

          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gray-500/60" />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Blancs</span>
        <span>Équilibre</span>
        <span>Noirs</span>
      </div>
    </div>
  );
}

function TopMovesSection({
  topMoves,
  showTermExplanations,
}: {
  topMoves: MoveAnalysis[];
  showTermExplanations: boolean;
}) {
  if (!topMoves || topMoves.length === 0) {
    return null;
  }

  return (
    <div className="pt-1">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-white">
          Les meilleures idées dans cette position
        </h3>

        <p className="mt-1 text-sm leading-6 text-gray-400">
          Chaque proposition est traduite pour expliquer la
          pièce à déplacer et l’objectif général du coup.
        </p>
      </div>

      <div className="space-y-3">
        {topMoves.map((move) => (
          <TopMoveCard
            key={`${move.rank}-${move.move}`}
            move={move}
            showTermExplanations={showTermExplanations}
          />
        ))}
      </div>
    </div>
  );
}

function TopMoveCard({
  move,
  showTermExplanations,
}: {
  move: MoveAnalysis;
  showTermExplanations: boolean;
}) {
  return (
    <article className="rounded-xl border border-gray-800 bg-gray-950 p-4 transition hover:border-gray-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <RankBadge rank={move.rank} />

          <div className="min-w-0">
            <p className="text-lg font-bold leading-7 text-white">
              {move.beginner_label}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Notation : {move.move_san}
              {" · "}
              {move.from_square} → {move.to_square}
            </p>
          </div>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Évaluation
          </p>

          <p className="mt-1 text-lg font-bold text-white">
            {formatEvaluation(move)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-800 bg-gray-900/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Explication simple
        </p>

        <p className="mt-1 text-sm leading-6 text-gray-300">
          {move.beginner_description}
        </p>

        <TermExplanations
          enabled={showTermExplanations}
          texts={[move.beginner_description]}
        />
      </div>

      {move.strategic_ideas.length > 0 && (
        <div className="mt-3 rounded-xl border border-gray-800 bg-gray-900/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Idées stratégiques
          </p>

          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-gray-300">
            {move.strategic_ideas.map((idea, index) => (
              <li
                key={`${idea}-${index}`}
                className="flex gap-2"
              >
                <span aria-hidden="true">•</span>
                <span>{idea}</span>
              </li>
            ))}
          </ul>

          <TermExplanations
            enabled={showTermExplanations}
            texts={move.strategic_ideas}
          />
        </div>
      )}

    </article>
  );
}

function RankBadge({
  rank,
}: {
  rank: number;
}) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-900 text-sm font-bold text-white">
      {rank}
    </div>
  );
}

function formatEvaluation(
  result: EvaluationData,
): string {
  if (result.evaluation_type === "mate") {
    if (result.evaluation === 0) {
      return "Mat";
    }

    const sign =
      result.evaluation > 0 ? "+" : "";

    return `Mat ${sign}${result.evaluation}`;
  }

  const sign =
    result.evaluation > 0 ? "+" : "";

  return `${sign}${result.evaluation.toFixed(2)}`;
}

function getPersonaCoachLead(
  personaId: AiPersonaId,
): string {
  switch (personaId) {
    case "tal":
      return "J’aime l’énergie de cette position :";
    case "capablanca":
      return "Restons simples et précis :";
    case "petrosian":
      return "Regardons d’abord ce que l’adversaire prépare :";
    case "fischer":
      return "Va droit au but, mais calcule la réponse :";
    case "carlsen":
      return "Garde la pression sans te précipiter :";
    default:
      return "Voici l’idée que je veux te faire retenir :";
  }
}

function getWhiteAdvantagePercentage(
  result: EvaluationData,
): number {
  if (result.evaluation_type === "mate") {
    if (result.evaluation > 0) {
      return 95;
    }

    if (result.evaluation < 0) {
      return 5;
    }

    return 50;
  }

  const cappedEvaluation = Math.max(
    -8,
    Math.min(8, result.evaluation),
  );

  const percentage =
    50 + (cappedEvaluation / 8) * 45;

  return Math.max(
    5,
    Math.min(95, percentage),
  );
}

function TermExplanations({
  texts,
  enabled = true,
}: {
  texts: string[];
  enabled?: boolean;
}) {
  if (!enabled) {
    return null;
  }

  const terms = findChessTerms(texts);

  if (terms.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-gray-800/80 pt-3">
      <p className="text-xs font-semibold text-gray-400">
        Termes utiles
      </p>

      <dl className="mt-1.5 space-y-1 text-xs leading-5 text-gray-400">
        {terms.map((item) => (
          <div key={item.term}>
            <dt className="inline font-semibold text-gray-300">
              {item.term} :
            </dt>{" "}
            <dd className="inline">
              {item.explanation}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function findChessTerms(
  texts: string[],
): ChessTerm[] {
  const searchableText = texts
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fr");

  return CHESS_GLOSSARY.filter((item) =>
    (item.aliases ?? [item.term]).some((alias) =>
      searchableText.includes(
        alias.toLocaleLowerCase("fr"),
      ),
    ),
  );
}

function getTermExplanation(term: string): string {
  return (
    CHESS_GLOSSARY.find(
      (item) => item.term === term,
    )?.explanation ?? ""
  );
}
