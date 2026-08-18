"use client";

import { useState } from "react";
import type { NoxMemoryEnvelope, NoxConceptId } from "@/lib/nox/memoryTypes";
import { NOX_CONCEPT_LABELS } from "@/lib/nox/memoryRules";

export default function NoxNotebook({
  memory,
  loading,
  onReset,
}: {
  memory: NoxMemoryEnvelope | null;
  loading: boolean;
  onReset: () => Promise<boolean>;
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
