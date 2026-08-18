"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { deterministicNoxProvider } from "@/lib/nox/deterministicNoxProvider";
import {
  getContextualQuickActions,
  NoxConversationService,
} from "@/lib/nox/noxConversationService";
import {
  appendNoxExchange,
  currentNoxSession,
  type NoxConversationSession,
} from "@/lib/nox/noxSession";
import type {
  NoxContext,
  NoxProvider,
  NoxQuickAction,
  NoxReply,
  NoxState,
} from "@/lib/nox/types";
import { NOX_RANK_ASSETS } from "@/lib/nox/rankAssets";

const STATE_STYLES: Record<
  NoxState,
  { label: string; dot: string; border: string }
> = {
  idle: {
    label: "À tes côtés",
    dot: "bg-slate-400",
    border: "border-indigo-900/70",
  },
  listening: {
    label: "Je t’écoute",
    dot: "animate-pulse bg-violet-400 motion-reduce:animate-none",
    border: "border-violet-700/80",
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
  onHighlightSquares,
  onClearVisual,
  showQuickActions = true,
  provider = deterministicNoxProvider,
}: {
  context: NoxContext;
  onShowMove?: (move: string) => void;
  onHighlightSquares?: (squares: string[]) => void;
  onClearVisual?: () => void;
  showQuickActions?: boolean;
  provider?: NoxProvider;
}) {
  const conversation = useMemo(
    () => new NoxConversationService(provider),
    [provider],
  );
  const questionId = useId();
  const reaction = useMemo(
    () => conversation.react(context),
    [context, conversation],
  );
  const quickActions = useMemo(
    () => getContextualQuickActions(context),
    [context],
  );
  const [session, setSession] = useState<NoxConversationSession | null>(null);
  const [draft, setDraft] = useState<{ contextKey: string; value: string }>({
    contextKey: context.contextKey,
    value: "",
  });
  const [expanded, setExpanded] = useState<{
    contextKey: string;
    value: boolean;
  }>({ contextKey: context.contextKey, value: false });
  const [focused, setFocused] = useState(false);
  const messageCounter = useRef(0);
  const currentSession = currentNoxSession(session, context.contextKey);
  const currentDraft = draft.contextKey === context.contextKey ? draft.value : "";
  const isExpanded =
    expanded.contextKey === context.contextKey ? expanded.value : false;
  const reply = currentSession?.currentReply ?? reaction;
  const displayState: NoxState = focused ? "listening" : reply.state;
  const appearance = STATE_STYLES[displayState];
  const progression = context.progression;
  const rankAsset = NOX_RANK_ASSETS[progression?.rank ?? "squire"];
  const [showEvolution, setShowEvolution] = useState(false);

  useEffect(() => {
    if (!progression?.recentlyEvolved || progression.rank === "squire") return;
    const key = `knightly:nox-evolution:${progression.rank}:${progression.lastRankChange ?? "preview"}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "seen");
    const timer = window.setTimeout(() => setShowEvolution(true), 0);
    return () => window.clearTimeout(timer);
  }, [progression?.lastRankChange, progression?.rank, progression?.recentlyEvolved]);

  useEffect(() => {
    onClearVisual?.();
  }, [context.contextKey, onClearVisual]);

  function showVerifiedVisual(nextReply: NoxReply): void {
    onClearVisual?.();
    if (nextReply.suggestedMove) onShowMove?.(nextReply.suggestedMove);
    if (nextReply.highlightedSquares?.length) {
      onHighlightSquares?.(nextReply.highlightedSquares);
    }
  }

  function appendExchange(
    userText: string,
    nextReply: NoxReply,
    activeAction: NoxQuickAction | null,
  ): void {
    messageCounter.current += 1;
    const idPrefix = `${context.contextKey}:${messageCounter.current}`;
    setSession((current) =>
      appendNoxExchange(
        current,
        context.contextKey,
        userText,
        nextReply,
        activeAction,
        idPrefix,
      ),
    );
    showVerifiedVisual(nextReply);
  }

  function handleAction(action: NoxQuickAction, label: string): void {
    appendExchange(label, conversation.askQuickAction(context, action), action);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const question = currentDraft.trim();
    if (!question) return;
    const { reply: nextReply } = conversation.askQuestion(context, question);
    appendExchange(question, nextReply, null);
    setDraft({ contextKey: context.contextKey, value: "" });
  }

  function resetConversation(): void {
    setSession(null);
    setDraft({ contextKey: context.contextKey, value: "" });
    onClearVisual?.();
  }

  return (
    <section
      data-testid="nox-shell"
      data-state={displayState}
      data-source="deterministic"
      aria-label="Nox, compagnon d’échecs"
      className={`overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-950/55 via-gray-900 to-gray-950 shadow-xl ${appearance.border}`}
    >
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <div className="shrink-0 text-center">
          <div className={`relative h-12 w-12 overflow-hidden rounded-2xl border bg-slate-950 shadow-[0_0_24px_rgba(99,102,241,0.24)] sm:h-16 sm:w-16 ${rankAsset.accent}`}>
            <Image
              src={rankAsset.avatar}
              alt="Nox, jeune écuyer et compagnon d’échecs"
              fill
              sizes="64px"
              className="object-cover"
              priority
            />
          </div>
          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-indigo-300">
            {progression?.rankLabel ?? "Écuyer"} <span aria-hidden="true">{rankAsset.emblem}</span>
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-300">
                Nox
              </p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${appearance.dot}`} />
                {appearance.label}
              </div>
            </div>
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() =>
                setExpanded({ contextKey: context.contextKey, value: !isExpanded })
              }
              className="rounded-lg border border-indigo-800/70 px-2.5 py-2 text-[11px] font-bold text-indigo-200 sm:hidden"
            >
              {isExpanded ? "Réduire" : "Parler à Nox"}
            </button>
          </div>

          <div className="mt-2" aria-live="polite" aria-atomic="true">
            <p className="font-bold text-white">{reply.title}</p>
            <p className="mt-1 text-sm leading-5 text-gray-300 sm:leading-6">
              {reply.message}
            </p>
          </div>
          {progression && (
            <div className="mt-2" aria-label={`Progression de Nox : ${progression.progressPercent} %`}>
              <div className="h-1 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-300 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${progression.progressPercent}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-gray-500">
                {progression.nextRankLabel ? `${progression.progressPercent}% vers ${progression.nextRankLabel}` : "Dernier rang narratif atteint"}
                {progression.preview ? " · aperçu DEV" : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      {showEvolution && progression && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Évolution de Nox">
          <div className="max-w-sm rounded-3xl border border-indigo-400/70 bg-gradient-to-br from-indigo-950 to-slate-950 p-7 text-center shadow-2xl motion-safe:animate-pulse motion-reduce:animate-none">
            <p className="text-4xl" aria-hidden="true">{rankAsset.emblem}</p>
            <h2 className="mt-3 text-2xl font-black text-white">Nox évolue !</h2>
            <p className="mt-3 text-indigo-100">Grâce à tout ce que nous avons appris ensemble, Nox devient <strong>{progression.rankLabel}</strong>.</p>
            <p className="mt-3 text-sm text-indigo-300">« Regarde mon armure ! On commence à former une sacrée équipe. »</p>
            <button type="button" onClick={() => setShowEvolution(false)} className="mt-5 rounded-xl bg-indigo-500 px-5 py-3 font-black text-white hover:bg-indigo-400">Continuer ensemble</button>
          </div>
        </div>
      )}

      <div className={`${isExpanded ? "block" : "hidden"} border-t border-white/5 px-3 py-3 sm:block sm:px-4`}>
        {showQuickActions && quickActions.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
              Que veux-tu comprendre ?
            </p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 xl:flex-wrap">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  aria-pressed={currentSession?.activeAction === action.id}
                  onClick={() => handleAction(action.id, action.label)}
                  className="min-h-10 shrink-0 rounded-xl border border-gray-700 bg-gray-950/55 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-indigo-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <label htmlFor={questionId} className="sr-only">
            Demande à Nox
          </label>
          <input
            id={questionId}
            value={currentDraft}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) =>
              setDraft({ contextKey: context.contextKey, value: event.target.value })
            }
            placeholder="Demande à Nox…"
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-950/70 px-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={!currentDraft.trim()}
            className="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Envoyer
          </button>
        </form>

        {currentSession && currentSession.messages.length > 0 && (
          <details className="mt-3 rounded-xl border border-white/5 bg-black/15">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold text-gray-400">
              Historique de cette position ({currentSession.messages.length / 2})
            </summary>
            <div className="max-h-52 space-y-2 overflow-y-auto border-t border-white/5 p-3">
              {currentSession.messages.map((entry) => (
                <div
                  key={entry.id}
                  className={
                    entry.role === "nox"
                      ? "mr-5 rounded-xl bg-indigo-950/55 px-3 py-2 text-xs leading-5 text-indigo-100"
                      : "ml-5 rounded-xl bg-gray-800 px-3 py-2 text-xs leading-5 text-gray-200"
                  }
                >
                  <span className="mr-1 font-black text-gray-400">
                    {entry.role === "nox" ? "Nox" : "Toi"} ·
                  </span>{" "}
                  {entry.text}
                </div>
              ))}
              <button
                type="button"
                onClick={resetConversation}
                className="text-[11px] font-bold text-gray-500 hover:text-white"
              >
                Effacer cette conversation
              </button>
            </div>
          </details>
        )}
        <p className="mt-2 text-[10px] leading-4 text-gray-600">
          Conversation locale à cette position. Nox répond seulement avec les faits disponibles.
        </p>
      </div>
    </section>
  );
}
