"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";

export type AnimatedBoardMove = {
  id: number;
  from: string;
  to: string;
  capture: boolean;
};

type BoardOrientation = "white" | "black";

function getSquarePosition(
  square: string,
  orientation: BoardOrientation,
): CSSProperties {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  const column =
    orientation === "white"
      ? file
      : 7 - file;
  const row =
    orientation === "white"
      ? 7 - rank
      : rank;

  return {
    left: `${column * 12.5}%`,
    top: `${row * 12.5}%`,
    width: "12.5%",
    height: "12.5%",
  };
}

export function useMoveAnimation(): {
  moveEffect: AnimatedBoardMove | null;
  animateMove: (
    from: string,
    to: string,
    capture?: boolean,
  ) => void;
} {
  const [moveEffect, setMoveEffect] =
    useState<AnimatedBoardMove | null>(
      null,
    );
  const sequence = useRef(0);
  const clearTimer =
    useRef<number | null>(null);

  useEffect(
    () => () => {
      if (clearTimer.current !== null) {
        window.clearTimeout(
          clearTimer.current,
        );
      }
    },
    [],
  );

  const animateMove = useCallback(
    (
      from: string,
      to: string,
      capture: boolean = false,
    ) => {
      sequence.current += 1;
      setMoveEffect({
        id: sequence.current,
        from,
        to,
        capture,
      });

      if (clearTimer.current !== null) {
        window.clearTimeout(
          clearTimer.current,
        );
      }

      clearTimer.current =
        window.setTimeout(() => {
          setMoveEffect(null);
        }, capture ? 620 : 480);
    },
    [],
  );

  return {
    moveEffect,
    animateMove,
  };
}

export default function MoveEffects({
  move,
  orientation,
}: {
  move: AnimatedBoardMove | null;
  orientation: BoardOrientation;
}) {
  if (!move) {
    return null;
  }

  const targetStyle = getSquarePosition(
    move.to,
    orientation,
  );
  const sourceStyle = getSquarePosition(
    move.from,
    orientation,
  );

  return (
    <div
      key={move.id}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      <span
        className="chess-move-origin"
        style={sourceStyle}
      />

      <span
        className={[
          "chess-move-impact",
          move.capture
            ? "chess-move-impact--capture"
            : "",
        ].join(" ")}
        style={targetStyle}
      >
        <span className="chess-move-ripple" />
        <span className="chess-move-flash" />

        {move.capture &&
          Array.from({ length: 8 }).map(
            (_, index) => (
              <span
                key={index}
                className="chess-capture-particle"
                style={
                  {
                    "--particle-angle": `${index * 45}deg`,
                    "--particle-delay": `${index * 12}ms`,
                  } as CSSProperties
                }
              />
            ),
          )}
      </span>
    </div>
  );
}
