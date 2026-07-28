"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { OnlineGame, OnlineMoveInput } from "@/lib/multiplayer/types";

const ACTIVE_GAME_KEY = "chess-coach-active-online-game";

type GameResponse = {
  game: OnlineGame;
};

export function useOnlineGame(enabled: boolean) {
  const [game, setGame] = useState<OnlineGame | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const pollingRef = useRef(false);

  const storeGame = useCallback((nextGame: OnlineGame | null) => {
    setGame(nextGame);
    if (nextGame) {
      window.localStorage.setItem(ACTIVE_GAME_KEY, nextGame.id);
    } else {
      window.localStorage.removeItem(ACTIVE_GAME_KEY);
    }
  }, []);

  const request = useCallback(
    async (url: string, init?: RequestInit): Promise<OnlineGame> => {
      const response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | GameResponse
        | { message?: string };

      if (!response.ok || !("game" in payload)) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "La partie ne peut pas être chargée.",
        );
      }
      return payload.game;
    },
    [],
  );

  const refresh = useCallback(
    async (gameId: string, silent = false) => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      if (!silent) setIsLoading(true);
      try {
        const nextGame = await request(`/api/multiplayer/games/${gameId}`);
        storeGame(nextGame);
        setError("");
      } catch (requestError) {
        if (!silent) {
          window.localStorage.removeItem(ACTIVE_GAME_KEY);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "La partie ne peut pas être actualisée.",
          );
        }
      } finally {
        pollingRef.current = false;
        if (!silent) setIsLoading(false);
      }
    },
    [request, storeGame],
  );

  useEffect(() => {
    if (!enabled || game) return;
    const storedGameId = window.localStorage.getItem(ACTIVE_GAME_KEY);
    if (storedGameId) {
      const timer = window.setTimeout(() => void refresh(storedGameId), 0);
      return () => window.clearTimeout(timer);
    }
  }, [enabled, game, refresh]);

  useEffect(() => {
    if (!enabled || !game || game.status === "finished") return;
    const timer = window.setInterval(() => {
      void refresh(game.id, true);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [enabled, game, refresh]);

  async function create(minutes: number): Promise<void> {
    setIsLoading(true);
    setError("");
    try {
      storeGame(
        await request("/api/multiplayer/games", {
          method: "POST",
          body: JSON.stringify({ minutes }),
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "L’invitation ne peut pas être créée.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function join(inviteCode: string): Promise<void> {
    setIsLoading(true);
    setError("");
    try {
      storeGame(
        await request("/api/multiplayer/games/join", {
          method: "POST",
          body: JSON.stringify({ inviteCode }),
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Cette invitation ne peut pas être rejointe.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function findMatch(minutes: number): Promise<void> {
    setIsLoading(true);
    setError("");
    try {
      storeGame(
        await request("/api/multiplayer/matchmaking", {
          method: "POST",
          body: JSON.stringify({ minutes }),
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Le matchmaking est momentanément indisponible.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function move(input: OnlineMoveInput): Promise<boolean> {
    if (!game) return false;
    setError("");
    try {
      storeGame(
        await request(`/api/multiplayer/games/${game.id}/moves`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      );
      return true;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ce coup n’a pas pu être joué.",
      );
      return false;
    }
  }

  async function resign(): Promise<void> {
    if (!game) return;
    setIsLoading(true);
    setError("");
    try {
      storeGame(
        await request(`/api/multiplayer/games/${game.id}/resign`, {
          method: "POST",
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "L’abandon n’a pas pu être enregistré.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function rematch(): Promise<void> {
    if (!game) return;
    setIsLoading(true);
    setError("");

    try {
      const endpoint =
        game.matchType ===
        "matchmaking"
          ? "/api/multiplayer/matchmaking"
          : "/api/multiplayer/games";
      const nextGame = await request(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify({
            minutes:
              game.timeControl
                .initialMinutes,
          }),
        },
      );
      storeGame(nextGame);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "La nouvelle partie ne peut pas être lancée.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return {
    game,
    error,
    isLoading,
    create,
    join,
    findMatch,
    move,
    resign,
    rematch,
    leave: async () => {
      if (game?.status === "waiting") {
        try {
          await fetch(`/api/multiplayer/games/${game.id}`, {
            method: "DELETE",
          });
        } catch {
          // La fermeture locale reste possible même si le réseau est coupé.
        }
      }
      storeGame(null);
      setError("");
    },
  };
}
