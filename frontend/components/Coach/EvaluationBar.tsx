"use client";

export type EvaluationType =
  | "cp"
  | "mate";

type EvaluationBarProps = {
  evaluation: number;
  evaluationType: EvaluationType;
  isAvailable?: boolean;
  ariaLabel?: string;
};

const MIN_WHITE_PERCENTAGE = 4;
const MAX_WHITE_PERCENTAGE = 96;

export default function EvaluationBar({
  evaluation,
  evaluationType,
  isAvailable = true,
  ariaLabel = "Évaluation de la position",
}: EvaluationBarProps) {
  const safeEvaluation = Number.isFinite(
    evaluation,
  )
    ? evaluation
    : 0;

  const whitePercentage = isAvailable
    ? getWhiteAdvantagePercentage(
        safeEvaluation,
        evaluationType,
      )
    : 50;

  const blackPercentage =
    100 - whitePercentage;

  const formattedEvaluation = isAvailable
    ? formatEvaluation(
        safeEvaluation,
        evaluationType,
      )
    : "—";

  const labelSide = getLabelSide(
    safeEvaluation,
    evaluationType,
  );

  return (
    <aside
      className="flex w-12 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-950 shadow-lg sm:w-14"
      aria-label={ariaLabel}
      title={
        isAvailable
          ? `Évaluation : ${formattedEvaluation}`
          : "Sélectionne un coup analysé pour afficher son évaluation."
      }
    >
      <div
        className="relative flex min-h-[280px] flex-1 flex-col overflow-hidden"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(
          whitePercentage,
        )}
        aria-valuetext={
          isAvailable
            ? `${formattedEvaluation}, ${Math.round(
                whitePercentage,
              )} % d’avantage visuel pour les Blancs`
            : "Évaluation indisponible"
        }
      >
        <div
          className="relative bg-white transition-[height] duration-500 ease-out"
          style={{
            height: `${whitePercentage}%`,
          }}
        >
          {labelSide === "white" && (
            <EvaluationLabel
              value={formattedEvaluation}
              tone="light"
              position="top"
            />
          )}
        </div>

        <div
          className="relative bg-gray-950 transition-[height] duration-500 ease-out"
          style={{
            height: `${blackPercentage}%`,
          }}
        >
          {labelSide === "black" && (
            <EvaluationLabel
              value={formattedEvaluation}
              tone="dark"
              position="bottom"
            />
          )}
        </div>

        {labelSide === "equal" && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-1">
            <div className="rounded bg-gray-700/95 py-1 text-center font-mono text-[10px] font-bold text-white shadow sm:text-xs">
              {formattedEvaluation}
            </div>
          </div>
        )}

        {!isAvailable && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-gray-900/30">
            <span className="rounded bg-gray-800/95 px-1.5 py-1 text-xs font-semibold text-gray-300">
              —
            </span>
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-x-0 z-10 h-px bg-gray-500/70 transition-[top] duration-500 ease-out"
          style={{
            top: `${whitePercentage}%`,
          }}
          aria-hidden="true"
        />
      </div>

      <div className="border-t border-gray-700 bg-gray-900 px-1 py-2 text-center">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[10px]">
          Éval.
        </p>
      </div>
    </aside>
  );
}

function EvaluationLabel({
  value,
  tone,
  position,
}: {
  value: string;
  tone: "light" | "dark";
  position: "top" | "bottom";
}) {
  return (
    <div
      className={[
        "pointer-events-none absolute inset-x-0 z-10 px-1",
        position === "top"
          ? "top-2"
          : "bottom-2",
      ].join(" ")}
    >
      <div
        className={[
          "rounded py-1 text-center font-mono text-[10px] font-bold shadow sm:text-xs",
          tone === "light"
            ? "bg-gray-900/90 text-white"
            : "bg-white/95 text-gray-950",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function getWhiteAdvantagePercentage(
  evaluation: number,
  evaluationType: EvaluationType,
): number {
  if (evaluationType === "mate") {
    if (evaluation > 0) {
      return MAX_WHITE_PERCENTAGE;
    }

    if (evaluation < 0) {
      return MIN_WHITE_PERCENTAGE;
    }

    return 50;
  }

  /*
   * Le backend renvoie actuellement l’évaluation
   * en pions, par exemple 1.25 et non 125.
   *
   * tanh évite qu’un avantage élevé remplisse
   * brutalement toute la barre.
   */
  const percentage =
    50 +
    50 * Math.tanh(evaluation / 3);

  return clamp(
    percentage,
    MIN_WHITE_PERCENTAGE,
    MAX_WHITE_PERCENTAGE,
  );
}

function formatEvaluation(
  evaluation: number,
  evaluationType: EvaluationType,
): string {
  if (evaluationType === "mate") {
    if (evaluation === 0) {
      return "#";
    }

    return evaluation > 0
      ? `#${evaluation}`
      : `#${evaluation}`;
  }

  const roundedEvaluation =
    Math.abs(evaluation) < 0.005
      ? 0
      : evaluation;

  const sign =
    roundedEvaluation > 0 ? "+" : "";

  return `${sign}${roundedEvaluation.toFixed(
    1,
  )}`;
}

function getLabelSide(
  evaluation: number,
  evaluationType: EvaluationType,
): "white" | "black" | "equal" {
  if (
    evaluationType === "cp" &&
    Math.abs(evaluation) < 0.15
  ) {
    return "equal";
  }

  if (evaluation > 0) {
    return "white";
  }

  if (evaluation < 0) {
    return "black";
  }

  return "equal";
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}