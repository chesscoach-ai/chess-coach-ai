"use client";

import type {
  PlacementResult,
  PlacementSession,
} from "@/lib/learning/placement";

export default function PlacementDiagnostic({
  session,
  result,
  isLoading,
  onStart,
  onContinue,
  onRestart,
}: {
  session: PlacementSession | null;
  result: PlacementResult | null;
  isLoading: boolean;
  onStart: () => void;
  onContinue: () => void;
  onRestart: () => void;
}) {
  if (result) {
    return (
      <details className="mb-4 rounded-2xl border border-blue-900/60 bg-blue-950/20">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-xl"
            aria-hidden="true"
          >
            🧭
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-300">
              Diagnostic terminé
            </p>
            <p className="truncate text-sm font-black text-white">
              Niveau {result.levelLabel} · repère pédagogique{" "}
              {result.estimatedRating}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {result.score}/100
          </span>
        </summary>
        <div className="border-t border-blue-900/40 px-4 py-3 text-xs leading-5 text-slate-400">
          Ce repère règle la difficulté des leçons. Il ne modifie jamais ton Elo
          multijoueur.
          <button
            type="button"
            disabled={isLoading}
            onClick={onRestart}
            className="ml-2 font-bold text-blue-300 hover:text-blue-200 disabled:opacity-60"
          >
            Refaire le diagnostic
          </button>
        </div>
      </details>
    );
  }

  const completed = session?.attempts.length ?? 0;
  const inProgress = Boolean(session && completed > 0);

  return (
    <section className="mb-4 rounded-2xl border border-amber-800/60 bg-gradient-to-r from-amber-950/25 to-slate-900 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-2xl"
          aria-hidden="true"
        >
          🧭
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">
            {inProgress ? `Diagnostic ${completed}/3` : "Trouve ton point de départ"}
          </p>
          <h2 className="mt-0.5 text-base font-black text-white">
            {inProgress
              ? "La prochaine position t’attend"
              : "3 décisions, environ 4 minutes"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Ouverture, tactique puis finale : assez pour adapter les leçons,
            pas assez pour te faire passer le bac des échecs.
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={inProgress ? onContinue : onStart}
          className="min-h-11 shrink-0 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
        >
          {isLoading
            ? "Préparation…"
            : inProgress
              ? "Continuer"
              : "Lancer le diagnostic"}
        </button>
      </div>
      {inProgress && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-amber-400"
            style={{ width: `${(completed / 3) * 100}%` }}
          />
        </div>
      )}
    </section>
  );
}
