"use client";

import { useMemo, useState } from "react";
import { Chess } from "chess.js";

import ChessBoard from "@/components/ChessBoard";
import AiOpponentPanel from "@/components/AI/AiOpponentPanel";
import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import OnlineLobby from "@/components/Multiplayer/OnlineLobby";
import OnlineMatch from "@/components/Multiplayer/OnlineMatch";
import CommunityHub from "@/components/Multiplayer/CommunityHub";
import PlayerStatistics from "@/components/Statistics/PlayerStatistics";
import { useChessGame } from "@/hooks/useChessGame";
import { useOnlineGame } from "@/hooks/useOnlineGame";
import { useAiOpponent } from "@/hooks/useAiOpponent";
import { getAiLevel, getAiPersona } from "@/lib/ai/opponents";

type MultiplayerKind = "online" | "ai" | "local" | "community";

export default function MultiplayerWorkspace({
  currentUser,
  onOpenGameReview,
}: {
  currentUser: CurrentUser | null;
  onOpenGameReview: (
    gameId: string,
  ) => Promise<void>;
}) {
  const [kind, setKind] = useState<MultiplayerKind>("online");
  const online = useOnlineGame(Boolean(currentUser) && kind === "online");

  return (
    <div className="space-y-6">
      <FairPlayNotice />

      <PlayerStatistics
        currentUser={currentUser}
        variant="multiplayer"
        refreshKey={`${online.game?.id ?? "lobby"}-${online.game?.status ?? "idle"}`}
      />

      <div
        role="tablist"
        aria-label="Type de partie multijoueur"
        className="mx-auto grid max-w-3xl grid-cols-2 rounded-xl border border-gray-800 bg-gray-900 p-1 sm:grid-cols-4"
      >
        <KindButton
          active={kind === "online"}
          label="Jouer en ligne"
          onClick={() => setKind("online")}
        />
        <KindButton
          active={kind === "ai"}
          label="Défier l’IA"
          onClick={() => setKind("ai")}
        />
        <KindButton
          active={kind === "local"}
          label="Jouer sur cet écran"
          onClick={() => setKind("local")}
        />
        <KindButton
          active={kind === "community"}
          label="Communauté"
          onClick={() => setKind("community")}
        />
      </div>

      {kind === "community" ? (
        <CommunityHub currentUser={currentUser} />
      ) : kind === "online" ? (
        online.game ? (
          <OnlineMatch
            game={online.game}
            error={online.error}
            isLoading={online.isLoading}
            onMove={online.move}
            onResign={online.resign}
            onLeave={online.leave}
            onRematch={online.rematch}
            onOpenReview={
              onOpenGameReview
            }
          />
        ) : (
          <OnlineLobby
            currentUser={currentUser}
            isLoading={online.isLoading}
            error={online.error}
            onCreate={online.create}
            onJoin={online.join}
            onFindMatch={online.findMatch}
          />
        )
      ) : kind === "ai" ? (
        <AiMatch />
      ) : (
        <LocalMatch />
      )}
    </div>
  );
}

function AiMatch() {
  const game = useChessGame();
  const opponent = useAiOpponent(game, true);
  const position = useMemo(() => new Chess(game.fen), [game.fen]);
  const result = getLocalGameResult(position);
  const persona = getAiPersona(opponent.personaId);
  const level = getAiLevel(opponent.levelId);
  const playerTurn =
    (position.turn() === "w" ? "white" : "black") === opponent.playerColor;

  return (
    <div className="space-y-5">
      <AiOpponentPanel opponent={opponent} context="competitive" />

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
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
        </aside>
      </section>
    </div>
  );
}

function KindButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "rounded-lg px-3 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-blue-600 text-white"
          : "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function FairPlayNotice() {
  return (
    <section className="rounded-2xl border border-violet-900/60 bg-violet-950/25 p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-300"
        >
          ♟
        </span>
        <div>
          <h2 className="font-semibold text-violet-100">
            Partie sans assistance
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-400">
            Stockfish, les évaluations, les suggestions et le coach sont
            entièrement désactivés pendant la partie. L’analyse sera proposée
            seulement après le résultat.
          </p>
        </div>
      </div>
    </section>
  );
}

function LocalMatch() {
  const game = useChessGame();
  const position = useMemo(() => new Chess(game.fen), [game.fen]);
  const whiteToMove = position.turn() === "w";
  const result = getLocalGameResult(position);

  return (
    <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
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

          <button
            type="button"
            onClick={game.reset}
            className="mt-4 w-full rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
          >
            Nouvelle partie locale
          </button>
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
      ? "Victoire des Noirs par échec et mat"
      : "Victoire des Blancs par échec et mat";
  }
  if (game.isStalemate()) return "Partie nulle par pat";
  if (game.isThreefoldRepetition()) return "Partie nulle par répétition";
  if (game.isInsufficientMaterial()) {
    return "Partie nulle : matériel insuffisant";
  }
  if (game.isDraw()) return "Partie nulle";
  return null;
}
