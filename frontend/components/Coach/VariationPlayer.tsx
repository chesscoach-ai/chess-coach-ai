"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

type VariationPlayerProps = {
  initialFen: string;
  variationSan: string[];
  variationUci: string[];
};

type VariationPosition = {
  fen: string;
  moveSan: string | null;
  moveUci: string | null;
};

export default function VariationPlayer({
  initialFen,
  variationSan,
  variationUci,
}: VariationPlayerProps) {
  const [isOpen, setIsOpen] =
    useState(false);
  const [positionIndex, setPositionIndex] =
    useState(0);

  const positions = useMemo(
    () =>
      buildVariationPositions(
        initialFen,
        variationUci,
      ),
    [initialFen, variationUci],
  );

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setPositionIndex(0);
      setIsOpen(false);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [initialFen, variationUci]);

  const maximumIndex =
    positions.length - 1;

  const currentPosition =
    positions[
      Math.min(positionIndex, maximumIndex)
    ] ?? {
      fen: initialFen,
      moveSan: null,
      moveUci: null,
    };

  if (
    variationUci.length === 0 ||
    positions.length <= 1
  ) {
    return null;
  }

  function goToPreviousMove(): void {
    setPositionIndex((current) =>
      Math.max(0, current - 1),
    );
  }

  function goToNextMove(): void {
    setPositionIndex((current) =>
      Math.min(maximumIndex, current + 1),
    );
  }

  function restartVariation(): void {
    setPositionIndex(0);
  }

  function goToEnd(): void {
    setPositionIndex(maximumIndex);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-800 bg-gray-950/50">
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-gray-900"
        aria-expanded={isOpen}
      >
        <div>
          <p className="text-sm font-semibold text-white">
            Jouer la meilleure variante
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Visualise la réponse recommandée
            coup par coup.
          </p>
        </div>

        <span className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200">
          {isOpen ? "Fermer" : "▶ Ouvrir"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-800 p-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
            <div className="overflow-hidden rounded-xl shadow-lg">
              <Chessboard
                options={{
                  position:
                    currentPosition.fen,
                  boardOrientation:
                    getBoardOrientation(
                      initialFen,
                    ),
                  animationDurationInMs: 220,
                  showNotation: true,
                  darkSquareStyle: {
                    backgroundColor:
                      "#4b5563",
                  },
                  lightSquareStyle: {
                    backgroundColor:
                      "#d1d5db",
                  },
                }}
              />
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Étape
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {positionIndex === 0
                    ? "Position de départ"
                    : currentPosition.moveSan ??
                      formatUciMove(
                        currentPosition.moveUci,
                      )}
                </p>

                <p className="mt-1 text-sm text-gray-400">
                  {positionIndex} /{" "}
                  {maximumIndex} demi-coups
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ControlButton
                  label="⏮ Début"
                  onClick={restartVariation}
                  disabled={
                    positionIndex === 0
                  }
                />

                <ControlButton
                  label="← Précédent"
                  onClick={goToPreviousMove}
                  disabled={
                    positionIndex === 0
                  }
                />

                <ControlButton
                  label="Suivant →"
                  onClick={goToNextMove}
                  disabled={
                    positionIndex ===
                    maximumIndex
                  }
                  primary
                />

                <ControlButton
                  label="Fin ⏭"
                  onClick={goToEnd}
                  disabled={
                    positionIndex ===
                    maximumIndex
                  }
                />
              </div>

              <ol className="mt-4 flex flex-wrap gap-2">
                {variationSan.map(
                  (move, index) => {
                    const movePositionIndex =
                      index + 1;
                    const isCurrent =
                      movePositionIndex ===
                      positionIndex;

                    return (
                      <li key={`${move}-${index}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setPositionIndex(
                              movePositionIndex,
                            );
                          }}
                          className={[
                            "rounded-lg border px-3 py-2 font-mono text-sm transition",
                            isCurrent
                              ? "border-blue-500 bg-blue-500/15 text-blue-200"
                              : "border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-700 hover:bg-gray-800",
                          ].join(" ")}
                        >
                          <span className="mr-1 text-xs text-gray-500">
                            {index + 1}.
                          </span>
                          {move}
                        </button>
                      </li>
                    );
                  },
                )}
              </ol>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35",
        primary
          ? "bg-blue-600 text-white hover:bg-blue-500"
          : "border border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function buildVariationPositions(
  initialFen: string,
  variationUci: string[],
): VariationPosition[] {
  let chess: Chess;

  try {
    chess = new Chess(initialFen);
  } catch {
    return [
      {
        fen: initialFen,
        moveSan: null,
        moveUci: null,
      },
    ];
  }

  const positions: VariationPosition[] = [
    {
      fen: chess.fen(),
      moveSan: null,
      moveUci: null,
    },
  ];

  for (const moveUci of variationUci) {
    const parsedMove =
      parseUciMove(moveUci);

    if (!parsedMove) {
      break;
    }

    try {
      const playedMove = chess.move({
        from: parsedMove.from,
        to: parsedMove.to,
        promotion:
          parsedMove.promotion,
      });

      if (!playedMove) {
        break;
      }

      positions.push({
        fen: chess.fen(),
        moveSan: playedMove.san,
        moveUci,
      });
    } catch {
      break;
    }
  }

  return positions;
}

function parseUciMove(
  move: string,
): {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
} | null {
  const match = move
    .trim()
    .toLowerCase()
    .match(
      /^([a-h][1-8])([a-h][1-8])([qrbn])?$/,
    );

  if (!match) {
    return null;
  }

  return {
    from: match[1],
    to: match[2],
    promotion:
      match[3] as
        | "q"
        | "r"
        | "b"
        | "n"
        | undefined,
  };
}

function getBoardOrientation(
  fen: string,
): "white" | "black" {
  const activeColor =
    fen.split(" ")[1];

  return activeColor === "b"
    ? "black"
    : "white";
}

function formatUciMove(
  move: string | null,
): string {
  if (!move) {
    return "—";
  }

  const parsed = parseUciMove(move);

  if (!parsed) {
    return move;
  }

  return `${parsed.from} → ${parsed.to}${
    parsed.promotion
      ? `=${parsed.promotion.toUpperCase()}`
      : ""
  }`;
}
