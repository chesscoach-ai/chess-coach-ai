"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { Chess } from "chess.js";

import ChessBoard from "@/components/ChessBoard";
import AiOpponentPanel from "@/components/AI/AiOpponentPanel";
import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import OnlineLobby from "@/components/Multiplayer/OnlineLobby";
import OnlineMatch from "@/components/Multiplayer/OnlineMatch";
import CommunityHub from "@/components/Multiplayer/CommunityHub";
import MultiplayerProfileBar from "@/components/Multiplayer/MultiplayerProfileBar";
import { useChessGame } from "@/hooks/useChessGame";
import { useOnlineGame } from "@/hooks/useOnlineGame";
import { useAiOpponent } from "@/hooks/useAiOpponent";
import { getAiLevel, getAiPersona } from "@/lib/ai/opponents";
import { NOX_RANK_ASSETS } from "@/lib/nox/rankAssets";
import { trackBetaEvent } from "@/lib/beta/client";

export type MultiplayerKind =
  | "launcher"
  | "online"
  | "friend"
  | "ai"
  | "local"
  | "community";

export default function MultiplayerWorkspace({
  currentUser,
  requestedKind,
  onKindChange,
  onOpenGameReview,
  onAnalyze,
  onAnalyzePgn,
  onHistory,
}: {
  currentUser: CurrentUser | null;
  requestedKind: MultiplayerKind;
  onKindChange: (kind: MultiplayerKind) => void;
  onOpenGameReview: (
    gameId: string,
  ) => Promise<void>;
  onAnalyze: () => void;
  onAnalyzePgn: (pgn: string) => void;
  onHistory: () => void;
}) {
  const kind = requestedKind;
  const online = useOnlineGame(
    Boolean(currentUser) && (kind === "online" || kind === "friend"),
  );

  function selectKind(nextKind: MultiplayerKind): void {
    onKindChange(nextKind);
  }

  return (
    <div id="multiplayer-workspace" className="scroll-mt-20 space-y-4 sm:space-y-6">
      <MultiplayerProfileBar
        currentUser={currentUser}
        onOpenCommunity={() => selectKind("community")}
      />

      {kind === "launcher" ? (
        <PlayLauncher onSelect={selectKind} onAnalyze={onAnalyze} onHistory={onHistory} />
      ) : kind === "community" ? (
        <CommunityHub
          currentUser={currentUser}
          onPlay={() => selectKind("launcher")}
        />
      ) : kind === "online" || kind === "friend" ? (
        <div className="space-y-4">
          {!online.game && (
            <ModeHeader
              title={kind === "friend" ? "Jouer avec un ami" : "Jouer en ligne"}
              description={
                kind === "friend"
                  ? "Crée une invitation ou rejoins un code privé"
                  : "Match classé contre un joueur proche de ton Elo"
              }
              onBack={() => selectKind("launcher")}
            />
          )}
          {online.game ? (
          <OnlineMatch
            game={online.game}
            error={online.error}
            isLoading={online.isLoading}
            onMove={online.move}
            onResign={online.resign}
            onOfferDraw={online.offerDraw}
            onAcceptDraw={online.acceptDraw}
            onDeclineDraw={online.declineDraw}
            onLeave={online.leave}
            onRematch={online.rematch}
            onOpenReview={
              onOpenGameReview
            }
          />
        ) : (
          <OnlineLobby
            currentUser={currentUser}
            view={kind === "friend" ? "friend" : "matchmaking"}
            isLoading={online.isLoading}
            error={online.error}
            onCreate={online.create}
            onJoin={online.join}
            onFindMatch={online.findMatch}
          />
        )}
        </div>
      ) : kind === "ai" ? (
        <div className="space-y-4">
          <ModeHeader
            title="Défier une IA"
            description="Choisis son niveau et son style avant le duel"
            onBack={() => selectKind("launcher")}
          />
          <AiMatch onAnalyze={onAnalyzePgn} />
        </div>
      ) : (
        <div className="space-y-4">
          <ModeHeader
            title="Jouer sur cet écran"
            description="Deux joueurs, un appareil, aucun classement"
            onBack={() => selectKind("launcher")}
          />
          <LocalMatch onAnalyze={onAnalyzePgn} />
        </div>
      )}

      {kind !== "launcher" && kind !== "community" && <FairPlayNotice />}
    </div>
  );
}

function AiMatch({ onAnalyze }: { onAnalyze: (pgn: string) => void }) {
  const game = useChessGame();
  const opponent = useAiOpponent(game, true);
  const position = useMemo(() => new Chess(game.fen), [game.fen]);
  const result = getLocalGameResult(position);
  useBetaGameEvents(game.moves.length, result);
  const persona = getAiPersona(opponent.personaId);
  const level = getAiLevel(opponent.levelId);
  const playerTurn =
    (position.turn() === "w" ? "white" : "black") === opponent.playerColor;

  return (
    <div className="space-y-5">
      <AiOpponentPanel opponent={opponent} context="competitive" />

      <section className="grid items-start justify-center gap-6 xl:grid-cols-[minmax(620px,760px)_minmax(320px,380px)]">
        <div className="min-w-0">
          <ChessBoard
            game={game}
            mode="competitive"
            playerColor={opponent.playerColor}
            interactionDisabled={!opponent.enabled || opponent.isThinking}
          />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
              Partie contre l’IA
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              {persona.name}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {persona.subtitle} · environ {level.estimatedElo} Elo
            </p>

            <div className="mt-5 space-y-2">
              <LocalPlayerRow
                name={`Toi · ${opponent.playerColor === "white" ? "Blancs" : "Noirs"}`}
                active={!result && playerTurn && !opponent.isThinking}
              />
              <LocalPlayerRow
                name={`${persona.name} · ${opponent.playerColor === "white" ? "Noirs" : "Blancs"}`}
                active={!result && !playerTurn}
              />
            </div>

            <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950/50 p-3">
              <p className="text-sm font-semibold text-gray-200">
                {result ??
                  (!opponent.enabled
                    ? "Duel interrompu"
                    : opponent.isThinking
                    ? "L’adversaire réfléchit…"
                    : playerTurn
                      ? "À toi de jouer"
                      : "Au tour de l’adversaire")}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {game.moves.length} demi-coup
                {game.moves.length > 1 ? "s" : ""} joué
                {game.moves.length > 1 ? "s" : ""}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-violet-900/50 bg-violet-950/20 p-4">
            <p className="text-sm font-semibold text-violet-200">
              Assistance masquée
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              Le moteur calcule uniquement les coups de l’adversaire. Il ne
              révèle ni évaluation, ni flèche, ni suggestion pendant ce duel.
            </p>
          </section>
          {result && <FinishedLocalGame onAnalyze={() => onAnalyze(game.pgn)} onRematch={game.reset} />}
        </aside>
      </section>
    </div>
  );
}

function PlayLauncher({
  onSelect,
  onAnalyze,
  onHistory,
}: {
  onSelect: (kind: MultiplayerKind) => void;
  onAnalyze: () => void;
  onHistory: () => void;
}) {
  const previewGame = useChessGame();
  const noxAvatar = NOX_RANK_ASSETS.squire.avatar;

  return (
    <section className="-mx-3 w-auto overflow-hidden border-y border-gray-800 bg-gray-900 shadow-2xl sm:mx-auto sm:w-full sm:max-w-7xl sm:rounded-3xl sm:border">
      <div className="flex items-center gap-3 border-b border-gray-800 bg-gradient-to-r from-blue-950/70 via-gray-900 to-violet-950/50 px-4 py-4 sm:px-7 sm:py-5">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-indigo-700 bg-slate-950"><Image src={noxAvatar} alt="Nox, ton compagnon d’échecs" fill sizes="48px" className="object-cover" /></div>
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">Jouer</p><h1 className="mt-0.5 text-xl font-black text-white sm:text-3xl">Prêt pour une partie ?</h1><p className="mt-1 text-sm text-gray-400">Nox sera là après le duel pour t’aider à comprendre.</p></div>
      </div>

      <div className="grid items-start gap-4 p-1.5 sm:gap-5 sm:p-6 xl:grid-cols-[minmax(560px,720px)_minmax(320px,390px)] xl:justify-center">
        <div className="min-w-0">
          <ChessBoard
            game={previewGame}
            mode="competitive"
            interactionDisabled
            presentationOnly
          />
          <p className="mt-2 px-2 text-center text-xs text-gray-500 sm:mt-3">
            L’échiquier devient interactif dès que ton mode est lancé.
          </p>
        </div>

        <div className="grid gap-3 px-2 pb-3 sm:px-0 sm:pb-0">
        <LaunchChoice
          icon="⚡"
          title="Jouer maintenant"
          description="Match en ligne contre un joueur proche de ton niveau"
          accent="blue"
          onClick={() => onSelect("online")}
        />
        <LaunchChoice
          icon="🤖"
          title="Défier une IA"
          description="Choisis un adversaire virtuel, du débutant au maître"
          accent="violet"
          onClick={() => onSelect("ai")}
        />
        <LaunchChoice
          icon="🤝"
          title="Jouer avec un ami"
          description="Crée ou saisis un code de partie privée"
          accent="cyan"
          onClick={() => onSelect("friend")}
        />
        <LaunchChoice
          icon="♟"
          title="Jouer sur cet écran"
          description="Une partie locale à deux sur le même appareil"
          accent="gray"
          onClick={() => onSelect("local")}
        />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onAnalyze} className="min-h-12 rounded-xl border border-violet-800 bg-violet-950/25 px-3 py-2 text-left text-xs font-bold text-violet-200 hover:bg-violet-950/45">💡 Analyser avec Nox</button>
          <button type="button" onClick={onHistory} className="min-h-12 rounded-xl border border-gray-700 bg-gray-950/45 px-3 py-2 text-left text-xs font-bold text-gray-300 hover:bg-gray-800">◷ Mes parties</button>
        </div>
        </div>
      </div>
    </section>
  );
}

function LaunchChoice({
  icon,
  title,
  description,
  accent,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  accent: "blue" | "violet" | "cyan" | "gray";
  onClick: () => void;
}) {
  const accentClasses = {
    blue: "border-blue-600 bg-blue-600/15 hover:border-blue-400 hover:bg-blue-600/25",
    violet:
      "border-violet-800 bg-violet-950/25 hover:border-violet-500 hover:bg-violet-950/45",
    cyan: "border-cyan-900 bg-cyan-950/20 hover:border-cyan-600 hover:bg-cyan-950/35",
    gray: "border-gray-700 bg-gray-950/45 hover:border-gray-500 hover:bg-gray-800",
  }[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${accentClasses}`}
    >
      <span
        aria-hidden="true"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gray-950/70 text-2xl shadow-inner"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-black text-white">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-gray-400">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="text-xl text-gray-600 transition group-hover:translate-x-1 group-hover:text-white"
      >
        →
      </span>
    </button>
  );
}

function ModeHeader({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <header className="mx-auto flex max-w-5xl items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/75 px-3 py-2.5">
      <button
        type="button"
        onClick={onBack}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gray-700 text-gray-300 transition hover:bg-gray-800 hover:text-white"
        aria-label="Revenir au choix du mode de jeu"
      >
        ←
      </button>
      <div className="min-w-0">
        <h1 className="truncate text-sm font-black text-white">{title}</h1>
        <p className="truncate text-xs text-gray-500">{description}</p>
      </div>
    </header>
  );
}

function FairPlayNotice() {
  return (
    <details className="group rounded-2xl border border-violet-900/50 bg-violet-950/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-300"
        >
          ♟
        </span>
        <div>
          <h2 className="text-sm font-semibold text-violet-100">
            Partie sans assistance
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Les conseils de Nox restent masqués jusqu’au résultat.
          </p>
        </div>
        </div>
        <span className="text-violet-300 transition group-open:rotate-180">
          ⌄
        </span>
      </summary>
      <p className="border-t border-violet-900/40 px-4 py-3 text-sm leading-6 text-gray-400">
        Les évaluations, les suggestions et Nox sont entièrement
        désactivés pendant la partie. L’analyse sera proposée seulement après
        le résultat.
      </p>
    </details>
  );
}

function LocalMatch({ onAnalyze }: { onAnalyze: (pgn: string) => void }) {
  const game = useChessGame();
  const position = useMemo(() => new Chess(game.fen), [game.fen]);
  const whiteToMove = position.turn() === "w";
  const result = getLocalGameResult(position);
  useBetaGameEvents(game.moves.length, result);

  return (
    <section className="grid items-start justify-center gap-6 xl:grid-cols-[minmax(620px,760px)_minmax(320px,380px)]">
      <div className="min-w-0">
        <ChessBoard game={game} mode="competitive" />
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Partie locale
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            Deux joueurs, un échiquier
          </h2>

          <div className="mt-5 space-y-2">
            <LocalPlayerRow
              name="Joueur avec les Blancs"
              active={!result && whiteToMove}
            />
            <LocalPlayerRow
              name="Joueur avec les Noirs"
              active={!result && !whiteToMove}
            />
          </div>

          <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950/50 p-3">
            <p className="text-sm font-semibold text-gray-200">
              {result ?? `${whiteToMove ? "Aux Blancs" : "Aux Noirs"} de jouer`}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {game.moves.length} demi-coup
              {game.moves.length > 1 ? "s" : ""} joué
              {game.moves.length > 1 ? "s" : ""}
            </p>
          </div>

          {!result && (
            <button
              type="button"
              onClick={game.reset}
              className="mt-4 w-full rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
            >
              Nouvelle partie locale
            </button>
          )}
          {result && <FinishedLocalGame onAnalyze={() => onAnalyze(game.pgn)} onRematch={game.reset} />}
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
          <h2 className="font-bold text-white">Partie non classée</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Ce mode fonctionne sur un seul écran. Il n’affecte pas le
            classement Elo et ne nécessite pas de compte.
          </p>
        </section>
      </aside>
    </section>
  );
}

function FinishedLocalGame({ onAnalyze, onRematch }: { onAnalyze: () => void; onRematch: () => void }) {
  return <section className="mt-4 rounded-xl border border-violet-800/70 bg-violet-950/30 p-3"><p className="text-xs font-black uppercase tracking-[0.14em] text-violet-300">Partie terminée</p><p className="mt-1 text-sm text-gray-300">Nox peut maintenant t’aider à comprendre les moments importants.</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={onAnalyze} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-500">Analyser avec Nox</button><button type="button" onClick={onRematch} className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-bold text-gray-300 hover:bg-gray-800">Rejouer</button></div></section>;
}

function useBetaGameEvents(moveCount: number, result: string | null) {
  const started = useRef(false);
  const completed = useRef(false);
  useEffect(() => {
    if (moveCount === 0) { started.current = false; completed.current = false; return; }
    if (!started.current) { started.current = true; trackBetaEvent("game_started"); }
    if (result && !completed.current) { completed.current = true; trackBetaEvent("game_completed"); }
  }, [moveCount, result]);
}

function LocalPlayerRow({
  name,
  active,
}: {
  name: string;
  active: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between rounded-xl border p-3",
        active
          ? "border-blue-700 bg-blue-950/30"
          : "border-gray-800 bg-gray-950/50",
      ].join(" ")}
    >
      <div>
        <p className="text-sm font-semibold text-gray-100">{name}</p>
        <p className="mt-0.5 text-xs text-gray-500">Sans classement Elo</p>
      </div>
      {active && (
        <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-300">
          À jouer
        </span>
      )}
    </div>
  );
}

function getLocalGameResult(game: Chess): string | null {
  if (game.isCheckmate()) {
    return game.turn() === "w"
      ? "Les Noirs ont maté sauvagement le roi blanc"
      : "Les Blancs ont maté sauvagement le roi noir";
  }
  if (game.isStalemate()) return "Partie nulle par pat";
  if (game.isThreefoldRepetition()) return "Partie nulle par répétition";
  if (game.isInsufficientMaterial()) {
    return "Partie nulle : matériel insuffisant";
  }
  if (game.isDraw()) return "Partie nulle";
  return null;
}
