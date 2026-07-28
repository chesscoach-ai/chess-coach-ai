"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";

import MoveEffects, {
  useMoveAnimation,
} from "@/components/ChessBoard/MoveEffects";
import type {
  OnlineGame,
  OnlineMoveInput,
  OnlinePlayer,
  PlayerColor,
} from "@/lib/multiplayer/types";

export default function OnlineMatch({
  game,
  error,
  isLoading,
  onMove,
  onResign,
  onLeave,
  onRematch,
  onOpenReview,
}: {
  game: OnlineGame;
  error: string;
  isLoading: boolean;
  onMove: (input: OnlineMoveInput) => Promise<boolean>;
  onResign: () => Promise<void>;
  onLeave: () => void;
  onRematch: () => Promise<void>;
  onOpenReview: (
    gameId: string,
  ) => Promise<void>;
}) {
  const [optimisticPosition, setOptimisticPosition] = useState<{
    sourceFen: string;
    displayedFen: string;
  } | null>(null);
  const [isMovePending, setIsMovePending] = useState(false);
  const {
    moveEffect,
    animateMove,
  } = useMoveAnimation();
  const animatedMoveCount = useRef(
    game.moves.length,
  );
  const animatedGameId = useRef(
    game.id,
  );
  const displayedFen =
    optimisticPosition?.sourceFen === game.fen
      ? optimisticPosition.displayedFen
      : game.fen;

  const canMove =
    game.status === "active" &&
    game.youAre === game.turn &&
    !isMovePending;
  const lastMove = game.moves.at(-1);

  useEffect(() => {
    if (
      animatedGameId.current !== game.id
    ) {
      animatedGameId.current = game.id;
      animatedMoveCount.current =
        game.moves.length;
      return;
    }

    if (
      game.moves.length ===
        animatedMoveCount.current ||
      !lastMove
    ) {
      return;
    }

    animatedMoveCount.current =
      game.moves.length;
    animateMove(
      lastMove.from,
      lastMove.to,
      lastMove.san.includes("x"),
    );
  }, [
    animateMove,
    game.id,
    game.moves.length,
    lastMove,
  ]);
  const squareStyles = useMemo<Record<string, CSSProperties>>(() => {
    if (!lastMove) return {};
    const style: CSSProperties = {
      background:
        "radial-gradient(circle, rgba(250, 204, 21, 0.72) 30%, rgba(250, 204, 21, 0.3) 70%)",
    };
    return { [lastMove.from]: style, [lastMove.to]: style };
  }, [lastMove]);

  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean {
    if (!canMove || !targetSquare) return false;
    const input: OnlineMoveInput = {
      from: sourceSquare as Square,
      to: targetSquare as Square,
      promotion: "q",
    };

    try {
      const preview = new Chess(game.fen);
      const playedMove =
        preview.move(input);
      setOptimisticPosition({
        sourceFen: game.fen,
        displayedFen: preview.fen(),
      });
      animateMove(
        input.from,
        input.to,
        Boolean(playedMove.captured),
      );
      animatedMoveCount.current =
        game.moves.length + 1;
    } catch {
      return false;
    }

    setIsMovePending(true);
    void onMove(input).then((accepted) => {
      if (!accepted) setOptimisticPosition(null);
      setIsMovePending(false);
    });
    return true;
  }

  return (
    <section className="space-y-5">
      {game.status === "waiting" && (
        <WaitingRoom game={game} onLeave={onLeave} />
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="chess-board-live w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl">
          <Chessboard
            options={{
              position: displayedFen,
              onPieceDrop: handlePieceDrop,
              boardOrientation: game.youAre,
              allowDragging: canMove,
              allowDrawingArrows: false,
              animationDurationInMs: 260,
              showNotation: true,
              squareStyles,
              darkSquareStyle: { backgroundColor: "#4b5563" },
              lightSquareStyle: { backgroundColor: "#d1d5db" },
            }}
          />
          <MoveEffects
            move={moveEffect}
            orientation={game.youAre}
          />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <OnlineMatchCard game={game} />

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-200"
            >
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {game.status === "active" ? (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void onResign()}
                className="rounded-xl border border-red-900 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-950/30 disabled:opacity-50"
              >
                Abandonner
              </button>
            ) : game.status ===
              "finished" ? (
              <>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    void onOpenReview(
                      game.id,
                    )
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                >
                  Voir le bilan
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() =>
                    void onRematch()
                  }
                  className="rounded-xl border border-blue-700 bg-blue-950/30 px-4 py-2.5 text-sm font-bold text-blue-200 transition hover:bg-blue-900/40 disabled:opacity-60"
                >
                  Rejouer
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onLeave}
                className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
              >
                Retour au salon
              </button>
            )}
            {game.status !==
              "finished" && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-center text-xs leading-5 text-gray-500">
                Stockfish
                <span className="block font-semibold text-gray-300">
                  Hors ligne
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function WaitingRoom({
  game,
  onLeave,
}: {
  game: OnlineGame;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isMatchmaking = game.matchType === "matchmaking";

  async function copyCode() {
    await navigator.clipboard.writeText(game.inviteCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <div className="rounded-2xl border border-blue-800 bg-blue-950/25 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-400">
        {isMatchmaking ? "Recherche classée" : "En attente de l’adversaire"}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          {isMatchmaking ? (
            <>
              <p className="text-lg font-bold text-white">
                Nous cherchons un joueur proche de ton Elo…
              </p>
              <p className="mt-1 text-sm text-gray-400">
                La partie démarrera automatiquement dès qu’un adversaire est
                trouvé.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-400">
                Transmets ce code privé à ton ami :
              </p>
              <p className="mt-1 font-mono text-3xl font-black tracking-[0.22em] text-white">
                {game.inviteCode}
              </p>
            </>
          )}
        </div>
        <div className="flex gap-2">
          {!isMatchmaking && (
            <button
              type="button"
              onClick={() => void copyCode()}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
            >
              {copied ? "Code copié" : "Copier le code"}
            </button>
          )}
          <button
            type="button"
            onClick={onLeave}
            className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function OnlineMatchCard({ game }: { game: OnlineGame }) {
  const activeText =
    game.status === "waiting"
      ? "En attente d’un adversaire"
      : game.status === "finished"
        ? game.termination ?? "Partie terminée"
        : game.youAre === game.turn
          ? "À toi de jouer"
          : "Au tour de ton adversaire";

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Partie classée ·{" "}
            {game.timeControl.speedLabel}{" "}
            {game.timeControl.label}
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">{activeText}</h2>
        </div>
        {game.result && (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-bold text-emerald-300">
            {game.result}
          </span>
        )}
      </div>

      <div className="mt-5 space-y-2">
        <OnlinePlayerRow
          color="black"
          player={game.black}
          active={game.status === "active" && game.turn === "black"}
          game={game}
        />
        <OnlinePlayerRow
          color="white"
          player={game.white}
          active={game.status === "active" && game.turn === "white"}
          game={game}
        />
      </div>

      <div className="mt-4 max-h-36 overflow-y-auto rounded-xl border border-gray-800 bg-gray-950/60 p-3">
        {game.moves.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun coup joué.</p>
        ) : (
          <ol className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-sm">
            {Array.from({ length: Math.ceil(game.moves.length / 2) }).map(
              (_, index) => (
                <li key={index} className="contents">
                  <span className="text-gray-600">{index + 1}.</span>
                  <span className="font-medium text-gray-200">
                    {game.moves[index * 2]?.san}
                  </span>
                  <span className="font-medium text-gray-200">
                    {game.moves[index * 2 + 1]?.san ?? ""}
                  </span>
                </li>
              ),
            )}
          </ol>
        )}
      </div>
    </section>
  );
}

function OnlinePlayerRow({
  color,
  player,
  active,
  game,
}: {
  color: PlayerColor;
  player: OnlinePlayer | null;
  active: boolean;
  game: OnlineGame;
}) {
  const ratingDelta =
    player?.ratingAfter != null ? player.ratingAfter - player.rating : null;

  return (
    <div
      className={[
        "flex items-center justify-between gap-3 rounded-xl border p-3",
        active
          ? "border-blue-700 bg-blue-950/30"
          : "border-gray-800 bg-gray-950/50",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-100">
          {player?.name ?? "Adversaire recherché"}
          {game.youAre === color && (
            <span className="ml-1 font-normal text-blue-400">(toi)</span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          {player ? (
            <>
              Elo {player.rating}
              {ratingDelta !== null && (
                <span
                  className={
                    ratingDelta >= 0 ? "text-emerald-400" : "text-red-400"
                  }
                >
                  {" "}
                  {ratingDelta >= 0 ? "+" : ""}
                  {ratingDelta}
                </span>
              )}
            </>
          ) : (
            "Partage le code d’invitation"
          )}
        </p>
      </div>
      <ChessClock game={game} color={color} active={active} />
    </div>
  );
}

function ChessClock({
  game,
  color,
  active,
}: {
  game: OnlineGame;
  color: PlayerColor;
  active: boolean;
}) {
  const clockKey = `${game.clocks.serverNow}-${color}-${active}`;
  const [sample, setSample] = useState({ key: "", elapsedMs: 0 });

  useEffect(() => {
    if (!active) return;
    const browserStartedAt = Date.now();
    const timer = window.setInterval(
      () =>
        setSample({
          key: clockKey,
          elapsedMs: Date.now() - browserStartedAt,
        }),
      250,
    );
    return () => window.clearInterval(timer);
  }, [active, clockKey]);

  const baseMs =
    color === "white" ? game.clocks.whiteMs : game.clocks.blackMs;
  const elapsed =
    active && game.status === "active"
      ? sample.key === clockKey
        ? sample.elapsedMs
        : 0
      : 0;
  const remainingMs = Math.max(0, baseMs - elapsed);
  const totalSeconds = Math.ceil(remainingMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <span
      className={[
        "shrink-0 rounded-lg px-3 py-1.5 font-mono text-lg font-bold",
        active ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300",
        remainingMs <= 30_000 ? "text-red-200" : "",
      ].join(" ")}
    >
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  );
}
