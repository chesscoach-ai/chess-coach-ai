"use client";

import type {
  PositionAnalysisResponse,
} from "@/services/api/ApiService";

type Props = {
  analysis:
    | PositionAnalysisResponse
    | null;
  isLoading?: boolean;
};

export default function BoardEvaluationBar({
  analysis,
  isLoading = false,
}: Props) {
  const whitePercentage =
    getWhitePercentage(analysis);

  const label =
    formatEvaluation(analysis);

  return (
    <aside
      aria-label="Jauge d’évaluation de la position"
      className="flex w-10 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-950 shadow-xl sm:w-12"
    >
      <div className="flex h-9 items-center justify-center bg-gray-900 px-1 text-[10px] font-bold text-gray-300">
        {isLoading ? "…" : label}
      </div>

      <div className="relative min-h-80 flex-1 bg-gray-950">
        <div
          className="absolute inset-x-0 bottom-0 bg-gray-100 transition-[height] duration-500 ease-out"
          style={{
            height: `${whitePercentage}%`,
          }}
        />

        <div className="absolute inset-x-0 top-1/2 z-10 h-px -translate-y-1/2 bg-blue-500/75" />

        <div className="absolute inset-x-0 top-2 z-10 text-center text-[10px] font-black text-white">
          N
        </div>

        <div className="absolute inset-x-0 bottom-2 z-10 text-center text-[10px] font-black text-gray-950">
          B
        </div>
      </div>
    </aside>
  );
}

function getWhitePercentage(
  analysis:
    | PositionAnalysisResponse
    | null,
): number {
  if (!analysis) {
    return 50;
  }

  if (
    analysis.evaluation_type === "mate"
  ) {
    if (analysis.evaluation > 0) {
      return 97;
    }

    if (analysis.evaluation < 0) {
      return 3;
    }

    return 50;
  }

  /*
   * Conversion douce de l’évaluation en
   * pourcentage visuel. Une avance de huit
   * pions ou plus s’approche du bord sans
   * masquer complètement l’autre camp.
   */
  const bounded = Math.max(
    -8,
    Math.min(8, analysis.evaluation),
  );

  return Math.max(
    3,
    Math.min(
      97,
      50 + (bounded / 8) * 47,
    ),
  );
}

function formatEvaluation(
  analysis:
    | PositionAnalysisResponse
    | null,
): string {
  if (!analysis) {
    return "0.0";
  }

  if (
    analysis.evaluation_type === "mate"
  ) {
    if (analysis.evaluation === 0) {
      return "M";
    }

    const sign =
      analysis.evaluation > 0
        ? "+"
        : "−";

    return `M${sign}${Math.abs(
      analysis.evaluation,
    )}`;
  }

  const sign =
    analysis.evaluation > 0
      ? "+"
      : analysis.evaluation < 0
        ? "−"
        : "";

  return `${sign}${Math.abs(
    analysis.evaluation,
  ).toFixed(1)}`;
}
