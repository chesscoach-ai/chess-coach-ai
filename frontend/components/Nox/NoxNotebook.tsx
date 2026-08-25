"use client";

import { useState } from "react";
import type { NoxMemoryEnvelope, NoxConceptId } from "@/lib/nox/memoryTypes";
import { NOX_CONCEPT_LABELS } from "@/lib/nox/memoryRules";
import type { NoxProgressionSnapshot } from "@/lib/nox/progressionTypes";

export default function NoxNotebook({
  memory,
  loading,
  onReset,
  progression,
  showProgressionSummary = true,
}: {
  memory: NoxMemoryEnvelope | null;
  loading: boolean;
  onReset: () => Promise<boolean>;
  progression?: NoxProgressionSnapshot | null;
  showProgressionSummary?: boolean;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const summary = memory?.summary;
  const goal = memory?.profile.goals[0];
  const milestones = memory?.profile.milestones.slice(0, 3) ?? [];
  const hasObservations = Boolean(
    summary &&
      (summary.strengths.length || summary.weaknesses.length || summary.learning.length || summary.improving.length),
  );

  return (
    <details className="group rounded-2xl border border-indigo-900/60 bg-indigo-950/20 shadow-lg">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-300">
            Mémoire pédagogique
          </p>
          <h2 className="mt-1 font-black text-white">Carnet de Nox</h2>
          <p className="mt-1 text-xs text-gray-400">
            {loading
              ? "Nox relit ses notes…"
              : hasObservations
                ? "Ce que nous maîtrisons et travaillons ensemble."
                : "Nox attend plusieurs observations avant de conclure."}
          </p>
        </div>
        <span className="text-indigo-300 transition group-open:rotate-180" aria-hidden="true">⌄</span>
      </summary>
      <div className="space-y-4 border-t border-indigo-900/40 px-4 py-4 text-sm">
        {showProgressionSummary && <div className="rounded-xl border border-indigo-900/60 bg-gray-950/45 p-3">
          <div className="flex items-center justify-between gap-3">
            <div><p className="font-black text-white">Nox — {progression?.rankLabel ?? "Écuyer"}</p><p className="mt-1 text-xs text-gray-400">Notre progression vient des échecs appris ensemble.</p></div>
            <span className="text-sm font-black text-indigo-300">{progression?.progressPercent ?? 0}%</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-800"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-300" style={{ width: `${progression?.progressPercent ?? 0}%` }} /></div>
          <p className="mt-2 text-xs text-indigo-200">{progression?.nextRankLabel ? `Chemin vers ${progression.nextRankLabel}` : "Tous les rangs narratifs sont atteints."}</p>
          {progression?.remaining[0] && <p className="mt-1 text-xs text-gray-400">Encore {progression.remaining[0]}.</p>}
          {progression?.sources.length ? <ul className="mt-2 space-y-1 text-xs text-gray-300">{progression.sources.map((source) => <li key={source}>• {source}</li>)}</ul> : null}
        </div>}
        <NotebookGroup title="✓ Nous maîtrisons" concepts={summary?.strengths ?? []} tone="text-emerald-300" empty="Pas encore de force confirmée." />
        <NotebookGroup
          title="À travailler"
          concepts={[...(summary?.weaknesses ?? []), ...(summary?.learning ?? []), ...(summary?.improving ?? [])]}
          tone="text-amber-300"
          empty="Les tendances apparaîtront après plusieurs parties ou exercices."
        />
        <div>
          <p className="font-bold text-violet-300">Objectif actuel</p>
          <p className="mt-1 leading-5 text-gray-300">
            {goal?.label ?? "Construire assez d’observations pour choisir un objectif fiable."}
          </p>
        </div>
        {milestones.length > 0 && (
          <div>
            <p className="font-bold text-blue-300">Souvenirs marquants</p>
            <ul className="mt-1 space-y-1 text-gray-300">
              {milestones.map((milestone) => <li key={milestone.id}>• {milestone.label}</li>)}
            </ul>
          </div>
        )}
        {progression?.milestones.length ? (
          <div><p className="font-bold text-indigo-300">Évolutions de Nox</p><ul className="mt-1 space-y-1 text-gray-300">{progression.milestones.slice(0, 3).map((milestone) => <li key={milestone.id}>• {milestone.label} <span className="text-gray-500">({new Date(milestone.occurredAt).toLocaleDateString("fr-FR")})</span></li>)}</ul></div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
          <p className="text-[11px] text-gray-500">
            {memory?.persistent
              ? "Mémoire liée à ton compte. Aucun dialogue brut n’est conservé."
              : "Mode invité : aucune mémoire durable n’est créée."}
          </p>
          {memory?.persistent && (
            confirmReset ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-bold text-gray-400"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void onReset().then(() => setConfirmReset(false))}
                  className="rounded-lg border border-red-800 px-3 py-2 text-xs font-bold text-red-300"
                >
                  Confirmer la suppression
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white"
              >
                Réinitialiser la mémoire
              </button>
            )
          )}
        </div>
      </div>
    </details>
  );
}

function NotebookGroup({
  title,
  concepts,
  tone,
  empty,
}: {
  title: string;
  concepts: NoxConceptId[];
  tone: string;
  empty: string;
}) {
  const unique = [...new Set(concepts)];
  return (
    <div>
      <p className={`font-bold ${tone}`}>{title}</p>
      {unique.length ? (
        <ul className="mt-1 space-y-1 text-gray-300">
          {unique.map((concept) => <li key={concept}>• {NOX_CONCEPT_LABELS[concept]}</li>)}
        </ul>
      ) : (
        <p className="mt-1 leading-5 text-gray-500">{empty}</p>
      )}
    </div>
  );
}
