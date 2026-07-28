"use client";

import type { PedagogicalDiagnostic } from "@/types/pedagogicalDiagnostic";

type Props = {
  diagnostic: PedagogicalDiagnostic;
  onReview?: () => void;
};

export default function PedagogicalDiagnosticCard({
  diagnostic,
  onReview,
}: Props) {
  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-950/65 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge
              severity={
                diagnostic.severity
              }
            />

            <ThemeBadge
              theme={
                diagnostic.primaryTheme
              }
            />

            <span className="text-xs text-gray-500">
              Coup{" "}
              {diagnostic.moveNumber}
              {diagnostic.side ===
              "black"
                ? "…"
                : "."}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-bold text-white">
            {diagnostic.title}
          </h3>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Perte estimée
          </p>
          <p className="mt-1 font-bold text-red-300">
            {(
              diagnostic.evaluationLossCp /
              100
            ).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <InfoBlock
          label="Ce qui s’est passé"
          text={diagnostic.summary}
        />
        <InfoBlock
          label="Pourquoi c’est important"
          text={diagnostic.whyItMatters}
        />
        <InfoBlock
          label="Conseil du coach"
          text={
            diagnostic.coachingAdvice
          }
        />
      </div>

      <div className="mt-5 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Comparaison
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <MoveBox
            label="Coup joué"
            move={
              diagnostic.playedMoveSan ??
              diagnostic.playedMoveUci
            }
            negative
          />
          <MoveBox
            label="Meilleur coup"
            move={
              diagnostic.bestMoveSan ??
              diagnostic.bestMoveUci
            }
          />
        </div>
      </div>

      {diagnostic
        .principalVariationSan
        ?.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Variante modèle
          </p>
          <p className="mt-2 font-mono text-sm leading-6 text-blue-200">
            {diagnostic.principalVariationSan
              .slice(0, 10)
              .join(" ")}
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-600">
          Confiance du diagnostic :{" "}
          {Math.round(
            diagnostic.confidence *
              100,
          )}
          %
        </p>

        {onReview && (
          <button
            type="button"
            onClick={onReview}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            Retravailler la position
          </button>
        )}
      </div>
    </article>
  );
}

function InfoBlock({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-gray-300">
        {text}
      </p>
    </div>
  );
}

function MoveBox({
  label,
  move,
  negative = false,
}: {
  label: string;
  move: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
      <p className="text-xs text-gray-500">
        {label}
      </p>
      <p
        className={[
          "mt-1 font-mono text-lg font-bold",
          negative
            ? "text-red-300"
            : "text-emerald-300",
        ].join(" ")}
      >
        {move}
      </p>
    </div>
  );
}

function SeverityBadge({
  severity,
}: {
  severity:
    | "info"
    | "inaccuracy"
    | "mistake"
    | "blunder";
}) {
  const label =
    severity === "blunder"
      ? "Gaffe"
      : severity === "mistake"
        ? "Erreur"
        : severity ===
            "inaccuracy"
          ? "Imprécision"
          : "À noter";

  return (
    <span className="rounded-full border border-red-900/70 bg-red-950/30 px-2.5 py-1 text-[11px] font-bold text-red-300">
      {label}
    </span>
  );
}

function ThemeBadge({
  theme,
}: {
  theme: string;
}) {
  return (
    <span className="rounded-full border border-blue-900/70 bg-blue-950/30 px-2.5 py-1 text-[11px] font-bold text-blue-300">
      {theme}
    </span>
  );
}
