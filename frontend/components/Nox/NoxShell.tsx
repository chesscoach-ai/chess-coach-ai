"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { deterministicNoxProvider } from "@/lib/nox/deterministicNoxProvider";
import type {
  NoxContext,
  NoxProvider,
  NoxQuickAction,
  NoxState,
} from "@/lib/nox/types";

const QUICK_ACTIONS: Array<{
  id: NoxQuickAction;
  label: string;
}> = [
  { id: "why", label: "Pourquoi ce coup ?" },
  { id: "plan", label: "Quel est mon plan ?" },
  { id: "missed", label: "Qu’est-ce que j’ai raté ?" },
  { id: "show", label: "Montre-moi" },
];

const STATE_STYLES: Record<
  NoxState,
  { label: string; dot: string; border: string }
> = {
  idle: {
    label: "À tes côtés",
    dot: "bg-slate-400",
    border: "border-indigo-900/70",
  },
  thinking: {
    label: "Je réfléchis",
    dot: "animate-pulse bg-blue-400 motion-reduce:animate-none",
    border: "border-blue-800/80",
  },
  tip: {
    label: "Conseil disponible",
    dot: "bg-indigo-400",
    border: "border-indigo-700/80",
  },
  success: {
    label: "Bien vu",
    dot: "bg-emerald-400",
    border: "border-emerald-700/80",
  },
  warning: {
    label: "À observer",
    dot: "bg-amber-400",
    border: "border-amber-700/80",
  },
};

export default function NoxShell({
  context,
  onShowMove,
  showQuickActions = true,
  provider = deterministicNoxProvider,
}: {
  context: NoxContext;
  onShowMove?: (move: string) => void;
  showQuickActions?: boolean;
  provider?: NoxProvider;
}) {
  const [selection, setSelection] = useState<{
    contextKey: string;
    action: NoxQuickAction;
  } | null>(null);
  const activeAction =
    selection?.contextKey === context.contextKey
      ? selection.action
      : null;

  const reply = useMemo(
    () => provider.getReply(context, activeAction),
    [activeAction, context, provider],
  );
  const appearance = STATE_STYLES[reply.state];

  function handleAction(action: NoxQuickAction): void {
    setSelection({ contextKey: context.contextKey, action });
    const nextReply = provider.getReply(context, action);
    if (action === "show" && nextReply.suggestedMove) {
      onShowMove?.(nextReply.suggestedMove);
    }
  }

  return (
    <section
      data-testid="nox-shell"
      data-state={reply.state}
      aria-label="Nox, compagnon d’échecs"
      className={`overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-950/55 via-gray-900 to-gray-950 shadow-xl ${appearance.border}`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="shrink-0 text-center">
          <div
            className={[
              "relative h-14 w-14 overflow-hidden rounded-2xl border border-indigo-500/60 bg-slate-950 shadow-[0_0_24px_rgba(99,102,241,0.24)] sm:h-16 sm:w-16",
              reply.state === "idle"
                ? "motion-safe:animate-[pulse_4s_ease-in-out_infinite]"
                : "",
            ].join(" ")}
          >
            <Image
              src="/brand/nox-squire.svg"
              alt="Nox, jeune écuyer et compagnon d’échecs"
              fill
              sizes="64px"
              className="object-cover"
              priority
            />
          </div>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-indigo-300">
            Écuyer
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-300">
                Nox
              </p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${appearance.dot}`}
                />
                {appearance.label}
              </div>
            </div>
            {reply.classificationLabel && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-gray-200">
                {reply.classificationLabel}
              </span>
            )}
          </div>

          <div className="mt-3" aria-live="polite" aria-atomic="true">
            <p className="font-bold text-white">{reply.title}</p>
            <p className="mt-1 text-sm leading-6 text-gray-300">
              {reply.message}
            </p>
          </div>
        </div>
      </div>

      {showQuickActions && (
        <div className="border-t border-white/5 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
            Que veux-tu comprendre ?
          </p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 xl:flex-wrap">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                aria-pressed={activeAction === action.id}
                onClick={() => handleAction(action.id)}
                className={[
                  "min-h-10 shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300",
                  activeAction === action.id
                    ? "border-indigo-500 bg-indigo-600/30 text-white"
                    : "border-gray-700 bg-gray-950/55 text-gray-300 hover:border-indigo-700 hover:text-white",
                ].join(" ")}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
