import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Chess } from "chess.js";
import { Pool, type PoolClient } from "pg";

import {
  applyOnlineMove,
  calculateEloRatings,
  currentClockValues,
} from "@/lib/multiplayer/gameRules";
import type { AuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import type {
  GameResult,
  OnlineGame,
  OnlineMove,
  OnlineMoveInput,
  PlayerColor,
  GameSpeed,
  OnlineGameHistoryItem,
  OnlinePlayerStatistics,
  OnlineTimeControl,
} from "@/lib/multiplayer/types";

type StoredPlayer = AuthenticatedPlayer & {
  rating: number;
  gamesPlayed: number;
};

export type CommunityPlayerSummary = {
  id: string;
  name: string;
  rating: number;
};

export type PlayerMatchStats = {
  wins: number;
  losses: number;
  draws: number;
  points: number;
};

type StoredGame = {
  id: string;
  inviteCode: string;
  status: "waiting" | "active" | "finished";
  whiteId: string;
  blackId: string | null;
  whiteName: string;
  blackName: string | null;
  whiteRatingBefore: number;
  blackRatingBefore: number | null;
  whiteRatingAfter: number | null;
  blackRatingAfter: number | null;
  fen: string;
  moves: OnlineMove[];
  initialMs: number;
  incrementMs: number;
  whiteTimeMs: number;
  blackTimeMs: number;
  turnStartedAt: string | null;
  result: GameResult | null;
  termination: string | null;
  createdAt: string;
  updatedAt: string;
  matchType?: "private" | "matchmaking";
  whiteAccuracy?: number | null;
  blackAccuracy?: number | null;
  reviewedAt?: string | null;
  endedAt?: string | null;
};

type LocalDatabase = {
  players: Record<string, StoredPlayer>;
  games: Record<string, StoredGame>;
};

const INITIAL_RATING = 1200;
const ALLOWED_MINUTES = [
  1, 3, 5, 10, 15,
];
const dataDirectory = path.join(process.cwd(), ".data");
const multiplayerFile = path.join(dataDirectory, "multiplayer.json");
let pool: Pool | null = null;
let databaseReady: Promise<void> | null = null;
let localQueue: Promise<unknown> = Promise.resolve();

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  databaseReady ??= pool
    .query(`
      CREATE TABLE IF NOT EXISTS multiplayer_players (
        id TEXT PRIMARY KEY,
        display_name VARCHAR(80) NOT NULL,
        rating INTEGER NOT NULL DEFAULT 1200,
        games_played INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS multiplayer_games (
        id UUID PRIMARY KEY,
        invite_code VARCHAR(8) UNIQUE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    .then(() => undefined);

  return pool;
}

async function readLocalDatabase(): Promise<LocalDatabase> {
  try {
    const contents = await readFile(multiplayerFile, "utf8");
    const parsed = JSON.parse(contents) as Partial<LocalDatabase>;
    return {
      players: parsed.players ?? {},
      games: parsed.games ?? {},
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { players: {}, games: {} };
    }
    throw error;
  }
}

async function writeLocalDatabase(database: LocalDatabase): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(multiplayerFile, JSON.stringify(database, null, 2), "utf8");
}

function withLocalLock<T>(
  operation: (database: LocalDatabase) => Promise<T> | T,
): Promise<T> {
  const run = localQueue.then(async () => {
    const database = await readLocalDatabase();
    const result = await operation(database);
    await writeLocalDatabase(database);
    return result;
  });
  localQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function createInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function ensureLocalPlayer(
  database: LocalDatabase,
  player: AuthenticatedPlayer,
): StoredPlayer {
  const existing = database.players[player.id];
  if (existing) {
    existing.name = player.name;
    return existing;
  }

  const stored: StoredPlayer = {
    ...player,
    rating: INITIAL_RATING,
    gamesPlayed: 0,
  };
  database.players[player.id] = stored;
  return stored;
}

async function ensurePostgresPlayer(
  client: PoolClient,
  player: AuthenticatedPlayer,
): Promise<StoredPlayer> {
  const result = await client.query<{
    id: string;
    display_name: string;
    rating: number;
    games_played: number;
  }>(
    `INSERT INTO multiplayer_players (id, display_name)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE
       SET display_name = EXCLUDED.display_name, updated_at = NOW()
     RETURNING id, display_name, rating, games_played`,
    [player.id, player.name],
  );
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.display_name,
    rating: row.rating,
    gamesPlayed: row.games_played,
  };
}

function makeStoredGame(
  player: StoredPlayer,
  inviteCode: string,
  minutes: number,
  matchType: "private" | "matchmaking" = "private",
): StoredGame {
  const now = new Date().toISOString();
  const initialMs = minutes * 60_000;
  return {
    id: randomUUID(),
    inviteCode,
    status: "waiting",
    whiteId: player.id,
    blackId: null,
    whiteName: player.name,
    blackName: null,
    whiteRatingBefore: player.rating,
    blackRatingBefore: null,
    whiteRatingAfter: null,
    blackRatingAfter: null,
    fen: new Chess().fen(),
    moves: [],
    initialMs,
    incrementMs: 0,
    whiteTimeMs: initialMs,
    blackTimeMs: initialMs,
    turnStartedAt: null,
    result: null,
    termination: null,
    createdAt: now,
    updatedAt: now,
    matchType,
    whiteAccuracy: null,
    blackAccuracy: null,
    reviewedAt: null,
    endedAt: null,
  };
}

function getTimeControl(
  initialMs: number,
  incrementMs: number,
): OnlineTimeControl {
  const initialMinutes = Math.round(
    initialMs / 60_000,
  );
  const incrementSeconds = Math.round(
    incrementMs / 1_000,
  );
  const speed =
    initialMinutes <= 1
      ? "bullet"
      : initialMinutes <= 5
        ? "blitz"
        : "rapid";

  return {
    initialMinutes,
    incrementSeconds,
    label: incrementSeconds
      ? `${initialMinutes} | ${incrementSeconds}`
      : `${initialMinutes} min`,
    speed,
    speedLabel:
      speed === "bullet"
        ? "Bullet"
        : speed === "blitz"
          ? "Blitz"
          : "Rapide",
  };
}

function assertParticipant(game: StoredGame, playerId: string): PlayerColor {
  if (game.whiteId === playerId) return "white";
  if (game.blackId === playerId) return "black";
  throw new Error("GAME_FORBIDDEN");
}

function finishLocalGame(
  database: LocalDatabase,
  game: StoredGame,
  result: GameResult,
  termination: string,
): void {
  if (game.status === "finished" || !game.blackId) return;
  const white = database.players[game.whiteId];
  const black = database.players[game.blackId];
  if (!white || !black) throw new Error("PLAYER_NOT_FOUND");

  const ratings = calculateEloRatings(white.rating, black.rating, result);
  white.rating = ratings.white;
  white.gamesPlayed += 1;
  black.rating = ratings.black;
  black.gamesPlayed += 1;
  game.whiteRatingAfter = ratings.white;
  game.blackRatingAfter = ratings.black;
  game.status = "finished";
  game.result = result;
  game.termination = termination;
  game.turnStartedAt = null;
  game.updatedAt =
    new Date().toISOString();
  game.endedAt = game.updatedAt;
}

async function finishPostgresGame(
  client: PoolClient,
  game: StoredGame,
  result: GameResult,
  termination: string,
): Promise<void> {
  if (game.status === "finished" || !game.blackId) return;
  const players = await client.query<{ id: string; rating: number }>(
    `SELECT id, rating
     FROM multiplayer_players
     WHERE id = ANY($1::text[])
     FOR UPDATE`,
    [[game.whiteId, game.blackId]],
  );
  const white = players.rows.find((row) => row.id === game.whiteId);
  const black = players.rows.find((row) => row.id === game.blackId);
  if (!white || !black) throw new Error("PLAYER_NOT_FOUND");

  const ratings = calculateEloRatings(white.rating, black.rating, result);
  await client.query(
    `UPDATE multiplayer_players
     SET rating = CASE WHEN id = $1 THEN $3 ELSE $4 END,
         games_played = games_played + 1,
         updated_at = NOW()
     WHERE id = ANY($2::text[])`,
    [game.whiteId, [game.whiteId, game.blackId], ratings.white, ratings.black],
  );
  game.whiteRatingAfter = ratings.white;
  game.blackRatingAfter = ratings.black;
  game.status = "finished";
  game.result = result;
  game.termination = termination;
  game.turnStartedAt = null;
  game.updatedAt =
    new Date().toISOString();
  game.endedAt = game.updatedAt;
}

function timeoutResult(game: StoredGame, now = new Date()): GameResult | null {
  if (game.status !== "active" || !game.turnStartedAt) return null;
  const turn = new Chess(game.fen).turn() === "w" ? "white" : "black";
  const clocks = currentClockValues({
    whiteMs: game.whiteTimeMs,
    blackMs: game.blackTimeMs,
    turn,
    turnStartedAt: game.turnStartedAt,
    now,
  });
  if (clocks.whiteMs === 0) return "0-1";
  if (clocks.blackMs === 0) return "1-0";
  return null;
}

function toPublicGame(game: StoredGame, playerId: string): OnlineGame {
  const youAre = assertParticipant(game, playerId);
  const turn = new Chess(game.fen).turn() === "w" ? "white" : "black";
  const clocks =
    game.status === "active"
      ? currentClockValues({
          whiteMs: game.whiteTimeMs,
          blackMs: game.blackTimeMs,
          turn,
          turnStartedAt: game.turnStartedAt,
        })
      : { whiteMs: game.whiteTimeMs, blackMs: game.blackTimeMs };

  return {
    id: game.id,
    inviteCode: game.inviteCode,
    status: game.status,
    fen: game.fen,
    moves: game.moves,
    white: {
      name: game.whiteName,
      rating: game.whiteRatingBefore,
      ratingAfter: game.whiteRatingAfter,
    },
    black:
      game.blackId && game.blackName && game.blackRatingBefore !== null
        ? {
            name: game.blackName,
            rating: game.blackRatingBefore,
            ratingAfter: game.blackRatingAfter,
          }
        : null,
    youAre,
    turn,
    clocks: {
      initialMs: game.initialMs,
      incrementMs: game.incrementMs,
      ...clocks,
      turnStartedAt: game.turnStartedAt,
      serverNow: new Date().toISOString(),
    },
    result: game.result,
    termination: game.termination,
    matchType: game.matchType ?? "private",
    createdAt: game.createdAt,
    endedAt:
      game.status === "finished"
        ? game.endedAt ??
          game.updatedAt
        : null,
    timeControl: getTimeControl(
      game.initialMs,
      game.incrementMs,
    ),
    whiteAccuracy:
      game.whiteAccuracy ?? null,
    blackAccuracy:
      game.blackAccuracy ?? null,
  };
}

async function savePostgresGame(
  client: PoolClient,
  game: StoredGame,
): Promise<void> {
  game.updatedAt = new Date().toISOString();
  await client.query(
    `UPDATE multiplayer_games
     SET data = $2::jsonb, updated_at = NOW()
     WHERE id = $1`,
    [game.id, JSON.stringify(game)],
  );
}

async function getLockedPostgresGame(
  client: PoolClient,
  gameId: string,
): Promise<StoredGame> {
  const result = await client.query<{ data: StoredGame }>(
    `SELECT data
     FROM multiplayer_games
     WHERE id = $1
     FOR UPDATE`,
    [gameId],
  );
  const game = result.rows[0]?.data;
  if (!game) throw new Error("GAME_NOT_FOUND");
  return game;
}

export async function createOnlineGame(
  player: AuthenticatedPlayer,
  minutes: number,
): Promise<OnlineGame> {
  const safeMinutes = ALLOWED_MINUTES.includes(minutes) ? minutes : 10;
  const database = getPool();

  if (!database) {
    return withLocalLock((local) => {
      const storedPlayer = ensureLocalPlayer(local, player);
      let inviteCode = createInviteCode();
      while (Object.values(local.games).some((game) => game.inviteCode === inviteCode)) {
        inviteCode = createInviteCode();
      }
      const game = makeStoredGame(
        storedPlayer,
        inviteCode,
        safeMinutes,
        "private",
      );
      local.games[game.id] = game;
      return toPublicGame(game, player.id);
    });
  }

  await databaseReady;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const storedPlayer = await ensurePostgresPlayer(client, player);
    let game: StoredGame | null = null;
    for (let attempt = 0; attempt < 5 && !game; attempt += 1) {
      const candidate = makeStoredGame(
        storedPlayer,
        createInviteCode(),
        safeMinutes,
        "private",
      );
      const insertion = await client.query(
        `INSERT INTO multiplayer_games (id, invite_code, data)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (invite_code) DO NOTHING
         RETURNING id`,
        [candidate.id, candidate.inviteCode, JSON.stringify(candidate)],
      );
      if (insertion.rowCount === 1) {
        game = candidate;
      }
    }
    if (!game) throw new Error("INVITE_CODE_UNAVAILABLE");
    await client.query("COMMIT");
    return toPublicGame(game, player.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findMatchmakingGame(
  player: AuthenticatedPlayer,
  minutes: number,
): Promise<OnlineGame> {
  const safeMinutes = ALLOWED_MINUTES.includes(minutes) ? minutes : 10;
  const database = getPool();

  if (!database) {
    return withLocalLock((local) => {
      const storedPlayer = ensureLocalPlayer(local, player);
      const candidate = Object.values(local.games)
        .filter(
          (game) =>
            game.status === "waiting" &&
            game.matchType === "matchmaking" &&
            game.whiteId !== player.id &&
            game.initialMs === safeMinutes * 60_000 &&
            Math.abs(game.whiteRatingBefore - storedPlayer.rating) <= 250,
        )
        .sort(
          (first, second) =>
            Math.abs(first.whiteRatingBefore - storedPlayer.rating) -
              Math.abs(second.whiteRatingBefore - storedPlayer.rating) ||
            first.createdAt.localeCompare(second.createdAt),
        )[0];

      if (candidate) {
        candidate.blackId = storedPlayer.id;
        candidate.blackName = storedPlayer.name;
        candidate.blackRatingBefore = storedPlayer.rating;
        candidate.status = "active";
        candidate.turnStartedAt = new Date().toISOString();
        candidate.updatedAt = candidate.turnStartedAt;
        return toPublicGame(candidate, player.id);
      }

      let inviteCode = createInviteCode();
      while (
        Object.values(local.games).some(
          (game) => game.inviteCode === inviteCode,
        )
      ) {
        inviteCode = createInviteCode();
      }
      const game = makeStoredGame(
        storedPlayer,
        inviteCode,
        safeMinutes,
        "matchmaking",
      );
      local.games[game.id] = game;
      return toPublicGame(game, player.id);
    });
  }

  await databaseReady;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const storedPlayer = await ensurePostgresPlayer(client, player);
    const waiting = await client.query<{ data: StoredGame }>(
      `SELECT data
       FROM multiplayer_games
       WHERE data->>'status' = 'waiting'
         AND data->>'matchType' = 'matchmaking'
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED`,
    );
    const candidate = waiting.rows
      .map((row) => row.data)
      .filter(
        (game) =>
          game.whiteId !== player.id &&
          game.initialMs === safeMinutes * 60_000 &&
          Math.abs(game.whiteRatingBefore - storedPlayer.rating) <= 250,
      )
      .sort(
        (first, second) =>
          Math.abs(first.whiteRatingBefore - storedPlayer.rating) -
          Math.abs(second.whiteRatingBefore - storedPlayer.rating),
      )[0];

    if (candidate) {
      candidate.blackId = storedPlayer.id;
      candidate.blackName = storedPlayer.name;
      candidate.blackRatingBefore = storedPlayer.rating;
      candidate.status = "active";
      candidate.turnStartedAt = new Date().toISOString();
      await savePostgresGame(client, candidate);
      await client.query("COMMIT");
      return toPublicGame(candidate, player.id);
    }

    let game: StoredGame | null = null;
    for (let attempt = 0; attempt < 5 && !game; attempt += 1) {
      const nextGame = makeStoredGame(
        storedPlayer,
        createInviteCode(),
        safeMinutes,
        "matchmaking",
      );
      const insertion = await client.query(
        `INSERT INTO multiplayer_games (id, invite_code, data)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (invite_code) DO NOTHING
         RETURNING id`,
        [nextGame.id, nextGame.inviteCode, JSON.stringify(nextGame)],
      );
      if (insertion.rowCount === 1) game = nextGame;
    }
    if (!game) throw new Error("INVITE_CODE_UNAVAILABLE");
    await client.query("COMMIT");
    return toPublicGame(game, player.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function joinOnlineGame(
  inviteCode: string,
  player: AuthenticatedPlayer,
): Promise<OnlineGame> {
  const normalizedCode = inviteCode.trim().toUpperCase();
  const database = getPool();

  if (!database) {
    return withLocalLock((local) => {
      const game = Object.values(local.games).find(
        (candidate) => candidate.inviteCode === normalizedCode,
      );
      if (!game) throw new Error("GAME_NOT_FOUND");
      if (game.whiteId === player.id) throw new Error("CANNOT_JOIN_OWN_GAME");
      if (game.status !== "waiting") throw new Error("GAME_ALREADY_STARTED");
      const storedPlayer = ensureLocalPlayer(local, player);
      game.blackId = storedPlayer.id;
      game.blackName = storedPlayer.name;
      game.blackRatingBefore = storedPlayer.rating;
      game.status = "active";
      game.turnStartedAt = new Date().toISOString();
      game.updatedAt = game.turnStartedAt;
      return toPublicGame(game, player.id);
    });
  }

  await databaseReady;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ data: StoredGame }>(
      `SELECT data
       FROM multiplayer_games
       WHERE invite_code = $1
       FOR UPDATE`,
      [normalizedCode],
    );
    const game = result.rows[0]?.data;
    if (!game) throw new Error("GAME_NOT_FOUND");
    if (game.whiteId === player.id) throw new Error("CANNOT_JOIN_OWN_GAME");
    if (game.status !== "waiting") throw new Error("GAME_ALREADY_STARTED");
    const storedPlayer = await ensurePostgresPlayer(client, player);
    game.blackId = storedPlayer.id;
    game.blackName = storedPlayer.name;
    game.blackRatingBefore = storedPlayer.rating;
    game.status = "active";
    game.turnStartedAt = new Date().toISOString();
    await savePostgresGame(client, game);
    await client.query("COMMIT");
    return toPublicGame(game, player.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getOnlineGame(
  gameId: string,
  player: AuthenticatedPlayer,
): Promise<OnlineGame> {
  const database = getPool();

  if (!database) {
    return withLocalLock((local) => {
      const game = local.games[gameId];
      if (!game) throw new Error("GAME_NOT_FOUND");
      assertParticipant(game, player.id);
      const timeout = timeoutResult(game);
      if (timeout) {
        finishLocalGame(
          local,
          game,
          timeout,
          timeout === "1-0"
            ? "Victoire des Blancs au temps"
            : "Victoire des Noirs au temps",
        );
      }
      return toPublicGame(game, player.id);
    });
  }

  await databaseReady;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const game = await getLockedPostgresGame(client, gameId);
    assertParticipant(game, player.id);
    const timeout = timeoutResult(game);
    if (timeout) {
      await finishPostgresGame(
        client,
        game,
        timeout,
        timeout === "1-0"
          ? "Victoire des Blancs au temps"
          : "Victoire des Noirs au temps",
      );
      await savePostgresGame(client, game);
    }
    await client.query("COMMIT");
    return toPublicGame(game, player.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelWaitingGame(
  gameId: string,
  player: AuthenticatedPlayer,
): Promise<void> {
  const database = getPool();

  if (!database) {
    await withLocalLock((local) => {
      const game = local.games[gameId];
      if (!game) return;
      if (game.whiteId !== player.id) throw new Error("GAME_FORBIDDEN");
      if (game.status !== "waiting") return;
      delete local.games[gameId];
    });
    return;
  }

  await databaseReady;
  const result = await database.query<{ data: StoredGame }>(
    `SELECT data FROM multiplayer_games WHERE id = $1 LIMIT 1`,
    [gameId],
  );
  const game = result.rows[0]?.data;
  if (!game) return;
  if (game.whiteId !== player.id) throw new Error("GAME_FORBIDDEN");
  if (game.status === "waiting") {
    await database.query(`DELETE FROM multiplayer_games WHERE id = $1`, [
      gameId,
    ]);
  }
}

function playStoredMove(
  game: StoredGame,
  playerId: string,
  input: OnlineMoveInput,
  now: Date,
): ReturnType<typeof applyOnlineMove> {
  const color = assertParticipant(game, playerId);
  if (game.status !== "active") throw new Error("GAME_NOT_ACTIVE");
  const turn = new Chess(game.fen).turn() === "w" ? "white" : "black";
  if (turn !== color) throw new Error("NOT_YOUR_TURN");

  const clocks = currentClockValues({
    whiteMs: game.whiteTimeMs,
    blackMs: game.blackTimeMs,
    turn,
    turnStartedAt: game.turnStartedAt,
    now,
  });
  if (clocks.whiteMs === 0 || clocks.blackMs === 0) {
    throw new Error("TIME_EXPIRED");
  }

  const applied = applyOnlineMove(
    game.fen,
    input,
    game.moves.map((move) => ({
      from: move.from,
      to: move.to,
      promotion: /^[a-h][1-8][a-h][1-8][qrbn]$/.test(move.uci)
        ? (move.uci[4] as "q" | "r" | "b" | "n")
        : undefined,
    })),
  );
  game.fen = applied.fen;
  game.moves.push({
    san: applied.san,
    uci: applied.uci,
    from: input.from,
    to: input.to,
    playedAt: now.toISOString(),
  });
  game.whiteTimeMs =
    clocks.whiteMs + (color === "white" ? game.incrementMs : 0);
  game.blackTimeMs =
    clocks.blackMs + (color === "black" ? game.incrementMs : 0);
  game.turnStartedAt = applied.result ? null : now.toISOString();
  game.updatedAt = now.toISOString();
  return applied;
}

export async function playOnlineMove(
  gameId: string,
  player: AuthenticatedPlayer,
  input: OnlineMoveInput,
): Promise<OnlineGame> {
  const database = getPool();

  if (!database) {
    return withLocalLock((local) => {
      const game = local.games[gameId];
      if (!game) throw new Error("GAME_NOT_FOUND");
      assertParticipant(game, player.id);
      const timeout = timeoutResult(game);
      if (timeout) {
        finishLocalGame(local, game, timeout, "Partie terminée au temps");
        return toPublicGame(game, player.id);
      }
      const applied = playStoredMove(game, player.id, input, new Date());
      if (applied.result && applied.termination) {
        finishLocalGame(local, game, applied.result, applied.termination);
      }
      return toPublicGame(game, player.id);
    });
  }

  await databaseReady;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const game = await getLockedPostgresGame(client, gameId);
    assertParticipant(game, player.id);
    const timeout = timeoutResult(game);
    if (timeout) {
      await finishPostgresGame(client, game, timeout, "Partie terminée au temps");
    } else {
      const applied = playStoredMove(game, player.id, input, new Date());
      if (applied.result && applied.termination) {
        await finishPostgresGame(
          client,
          game,
          applied.result,
          applied.termination,
        );
      }
    }
    await savePostgresGame(client, game);
    await client.query("COMMIT");
    return toPublicGame(game, player.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resignOnlineGame(
  gameId: string,
  player: AuthenticatedPlayer,
): Promise<OnlineGame> {
  const database = getPool();

  if (!database) {
    return withLocalLock((local) => {
      const game = local.games[gameId];
      if (!game) throw new Error("GAME_NOT_FOUND");
      const color = assertParticipant(game, player.id);
      if (game.status !== "active") throw new Error("GAME_NOT_ACTIVE");
      finishLocalGame(
        local,
        game,
        color === "white" ? "0-1" : "1-0",
        `${color === "white" ? "Les Blancs" : "Les Noirs"} abandonnent`,
      );
      return toPublicGame(game, player.id);
    });
  }

  await databaseReady;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const game = await getLockedPostgresGame(client, gameId);
    const color = assertParticipant(game, player.id);
    if (game.status !== "active") throw new Error("GAME_NOT_ACTIVE");
    await finishPostgresGame(
      client,
      game,
      color === "white" ? "0-1" : "1-0",
      `${color === "white" ? "Les Blancs" : "Les Noirs"} abandonnent`,
    );
    await savePostgresGame(client, game);
    await client.query("COMMIT");
    return toPublicGame(game, player.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getOnlinePlayerRating(playerId: string): Promise<number> {
  const database = getPool();
  if (!database) {
    const local = await readLocalDatabase();
    return local.players[playerId]?.rating ?? INITIAL_RATING;
  }

  await databaseReady;
  const result = await database.query<{ rating: number }>(
    `SELECT rating
     FROM multiplayer_players
     WHERE id = $1
     LIMIT 1`,
    [playerId],
  );
  return result.rows[0]?.rating ?? INITIAL_RATING;
}

function buildGamePgn(
  game: StoredGame,
): string {
  const chess = new Chess();
  chess.setHeader(
    "Event",
    game.matchType === "matchmaking"
      ? "Partie classée en ligne"
      : "Partie privée en ligne",
  );
  chess.setHeader("Site", "Chess Coach AI");
  chess.setHeader(
    "Date",
    game.createdAt.slice(0, 10).replaceAll("-", "."),
  );
  chess.setHeader("White", game.whiteName);
  chess.setHeader(
    "Black",
    game.blackName ?? "Adversaire",
  );
  chess.setHeader(
    "Result",
    game.result ?? "*",
  );
  chess.setHeader(
    "TimeControl",
    `${Math.round(game.initialMs / 1_000)}+${
      Math.round(game.incrementMs / 1_000)
    }`,
  );

  game.moves.forEach((move) => {
    chess.move({
      from: move.from,
      to: move.to,
      promotion:
        move.uci.slice(4) || undefined,
    });
  });

  return chess.pgn();
}

export async function listFinishedOnlineGames(
  player: AuthenticatedPlayer,
  unlockedGameIds: string[] = [],
): Promise<OnlineGameHistoryItem[]> {
  const database = getPool();
  let games: StoredGame[];

  if (!database) {
    const local =
      await readLocalDatabase();
    games = Object.values(local.games);
  } else {
    await databaseReady;
    const result = await database.query<{
      data: StoredGame;
    }>(
      `SELECT data
       FROM multiplayer_games
       WHERE data->>'status' = 'finished'
         AND (data->>'whiteId' = $1 OR data->>'blackId' = $1)
       ORDER BY COALESCE(data->>'endedAt', data->>'updatedAt') DESC
       LIMIT 100`,
      [player.id],
    );
    games = result.rows.map(
      (row) => row.data,
    );
  }

  const unlocked = new Set(
    unlockedGameIds,
  );

  return games
    .filter(
      (game) =>
        game.status === "finished" &&
        game.result &&
        game.termination &&
        game.blackId &&
        game.blackName &&
        game.blackRatingBefore !== null &&
        (game.whiteId === player.id ||
          game.blackId === player.id),
    )
    .sort((a, b) =>
      (b.endedAt ?? b.updatedAt).localeCompare(
        a.endedAt ?? a.updatedAt,
      ),
    )
    .slice(0, 100)
    .map((game) => ({
      id: game.id,
      white: {
        name: game.whiteName,
        rating: game.whiteRatingBefore,
        ratingAfter:
          game.whiteRatingAfter,
      },
      black: {
        name: game.blackName!,
        rating:
          game.blackRatingBefore!,
        ratingAfter:
          game.blackRatingAfter,
      },
      result: game.result!,
      termination: game.termination!,
      createdAt: game.createdAt,
      endedAt:
        game.endedAt ??
        game.updatedAt,
      timeControl: getTimeControl(
        game.initialMs,
        game.incrementMs,
      ),
      whiteAccuracy:
        game.whiteAccuracy ?? null,
      blackAccuracy:
        game.blackAccuracy ?? null,
      reviewUnlocked:
        unlocked.has(game.id) ||
        Boolean(game.reviewedAt),
      pgn: buildGamePgn(game),
    }));
}

export async function getOnlinePlayerStatistics(
  player: AuthenticatedPlayer,
): Promise<OnlinePlayerStatistics> {
  const database = getPool();
  let games: StoredGame[];
  let currentRating = INITIAL_RATING;

  if (!database) {
    const local = await readLocalDatabase();
    games = Object.values(local.games);
    currentRating =
      local.players[player.id]?.rating ??
      INITIAL_RATING;
  } else {
    await databaseReady;
    const [gamesResult, playerResult] =
      await Promise.all([
        database.query<{ data: StoredGame }>(
          `SELECT data
           FROM multiplayer_games
           WHERE data->>'status' = 'finished'
             AND (data->>'whiteId' = $1 OR data->>'blackId' = $1)`,
          [player.id],
        ),
        database.query<{ rating: number }>(
          `SELECT rating
           FROM multiplayer_players
           WHERE id = $1
           LIMIT 1`,
          [player.id],
        ),
      ]);
    games = gamesResult.rows.map(
      (row) => row.data,
    );
    currentRating =
      playerResult.rows[0]?.rating ??
      INITIAL_RATING;
  }

  const finished = games.filter(
    (game) =>
      game.status === "finished" &&
      game.result &&
      (game.whiteId === player.id ||
        game.blackId === player.id),
  );
  const bySpeed = createEmptySpeedStatistics();
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let peakRating = currentRating;
  const accuracies: number[] = [];
  const activityDates = new Set<string>();

  for (const game of finished) {
    const playerIsWhite =
      game.whiteId === player.id;
    const result = game.result!;
    const won =
      (playerIsWhite && result === "1-0") ||
      (!playerIsWhite && result === "0-1");
    const drawn = result === "1/2-1/2";
    const speed = getTimeControl(
      game.initialMs,
      game.incrementMs,
    ).speed;
    const speedStats = bySpeed[speed];

    speedStats.games += 1;
    if (won) {
      wins += 1;
      speedStats.wins += 1;
    } else if (drawn) {
      draws += 1;
      speedStats.draws += 1;
    } else {
      losses += 1;
      speedStats.losses += 1;
    }

    const ratingBefore = playerIsWhite
      ? game.whiteRatingBefore
      : game.blackRatingBefore;
    const ratingAfter = playerIsWhite
      ? game.whiteRatingAfter
      : game.blackRatingAfter;
    peakRating = Math.max(
      peakRating,
      ratingBefore ?? INITIAL_RATING,
      ratingAfter ?? INITIAL_RATING,
    );

    const accuracy = playerIsWhite
      ? game.whiteAccuracy
      : game.blackAccuracy;
    if (typeof accuracy === "number") {
      accuracies.push(accuracy);
    }

    activityDates.add(
      getParisDateKey(
        game.endedAt ??
          game.updatedAt,
      ),
    );
  }

  const chronological = [...finished].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt),
  );
  const first = chronological[0];
  const firstRating = first
    ? first.whiteId === player.id
      ? first.whiteRatingBefore
      : (first.blackRatingBefore ??
        INITIAL_RATING)
    : currentRating;

  return {
    games: finished.length,
    wins,
    draws,
    losses,
    currentRating,
    peakRating,
    ratingChange:
      currentRating - firstRating,
    averageAccuracy:
      accuracies.length > 0
        ? Math.round(
            accuracies.reduce(
              (total, value) =>
                total + value,
              0,
            ) / accuracies.length,
          )
        : null,
    analyzedGames: accuracies.length,
    currentStreak:
      getCurrentActivityStreak(
        activityDates,
      ),
    activityDates: Array.from(
      activityDates,
    ).sort(),
    bySpeed,
  };
}

function getParisDateKey(
  date: string | Date,
): string {
  const parts =
    new Intl.DateTimeFormat("fr-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(date));
  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function getCurrentActivityStreak(
  activityDates: Set<string>,
): number {
  if (activityDates.size === 0) {
    return 0;
  }

  const cursor = new Date();
  const today = getParisDateKey(cursor);
  if (!activityDates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
    if (
      !activityDates.has(
        getParisDateKey(cursor),
      )
    ) {
      return 0;
    }
  }

  let streak = 0;
  while (
    activityDates.has(
      getParisDateKey(cursor),
    )
  ) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function createEmptySpeedStatistics(): Record<
  GameSpeed,
  {
    games: number;
    wins: number;
    draws: number;
    losses: number;
  }
> {
  return {
    bullet: {
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    },
    blitz: {
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    },
    rapid: {
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    },
  };
}

export async function saveOnlineGameAccuracy(
  gameId: string,
  player: AuthenticatedPlayer,
  whiteAccuracy: number,
  blackAccuracy: number,
): Promise<void> {
  const normalize = (value: number) =>
    Math.max(
      0,
      Math.min(100, Math.round(value)),
    );
  const database = getPool();

  if (!database) {
    await withLocalLock((local) => {
      const game = local.games[gameId];
      if (!game) {
        throw new Error("GAME_NOT_FOUND");
      }
      assertParticipant(game, player.id);
      if (game.status !== "finished") {
        throw new Error("GAME_NOT_FINISHED");
      }
      game.whiteAccuracy =
        normalize(whiteAccuracy);
      game.blackAccuracy =
        normalize(blackAccuracy);
      game.reviewedAt =
        new Date().toISOString();
      game.updatedAt = game.reviewedAt;
    });
    return;
  }

  await databaseReady;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const game =
      await getLockedPostgresGame(
        client,
        gameId,
      );
    assertParticipant(game, player.id);
    if (game.status !== "finished") {
      throw new Error(
        "GAME_NOT_FINISHED",
      );
    }
    game.whiteAccuracy =
      normalize(whiteAccuracy);
    game.blackAccuracy =
      normalize(blackAccuracy);
    game.reviewedAt =
      new Date().toISOString();
    await savePostgresGame(client, game);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function searchOnlinePlayers(
  query: string,
  excludePlayerId?: string,
): Promise<CommunityPlayerSummary[]> {
  const normalized = query.trim().toLocaleLowerCase("fr");
  if (normalized.length < 2) return [];
  const database = getPool();

  if (!database) {
    const local = await readLocalDatabase();
    return Object.values(local.players)
      .filter(
        (player) =>
          player.id !== excludePlayerId &&
          (player.name.toLocaleLowerCase("fr").includes(normalized) ||
            player.id.toLocaleLowerCase("fr") === normalized),
      )
      .slice(0, 8)
      .map(({ id, name, rating }) => ({ id, name, rating }));
  }

  await databaseReady;
  const result = await database.query<{
    id: string;
    display_name: string;
    rating: number;
  }>(
    `SELECT id, display_name, rating
     FROM multiplayer_players
     WHERE id <> COALESCE($2, '')
       AND (LOWER(display_name) LIKE $1 OR LOWER(id) = $3)
     ORDER BY rating DESC
     LIMIT 8`,
    [`%${normalized}%`, excludePlayerId ?? "", normalized],
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.display_name,
    rating: row.rating,
  }));
}

export async function getOnlinePlayerSummaries(
  playerIds: string[],
): Promise<CommunityPlayerSummary[]> {
  if (playerIds.length === 0) return [];
  const database = getPool();

  if (!database) {
    const local = await readLocalDatabase();
    return playerIds.flatMap((id) => {
      const player = local.players[id];
      return player
        ? [{ id: player.id, name: player.name, rating: player.rating }]
        : [];
    });
  }

  await databaseReady;
  const result = await database.query<{
    id: string;
    display_name: string;
    rating: number;
  }>(
    `SELECT id, display_name, rating
     FROM multiplayer_players
     WHERE id = ANY($1::text[])`,
    [playerIds],
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.display_name,
    rating: row.rating,
  }));
}

export async function getPlayerMatchStats(
  playerId: string,
  monthPrefix?: string,
): Promise<PlayerMatchStats> {
  const database = getPool();
  let games: StoredGame[];

  if (!database) {
    const local = await readLocalDatabase();
    games = Object.values(local.games);
  } else {
    await databaseReady;
    const result = await database.query<{ data: StoredGame }>(
      `SELECT data
       FROM multiplayer_games
       WHERE data->>'status' = 'finished'
         AND (data->>'whiteId' = $1 OR data->>'blackId' = $1)`,
      [playerId],
    );
    games = result.rows.map((row) => row.data);
  }

  const stats = games
    .filter(
      (game) =>
        game.status === "finished" &&
        game.result &&
        (game.whiteId === playerId || game.blackId === playerId) &&
        (!monthPrefix || game.updatedAt.startsWith(monthPrefix)),
    )
    .reduce(
      (total, game) => {
        if (game.result === "1/2-1/2") {
          total.draws += 1;
          total.points += 1;
          return total;
        }
        const won =
          (game.whiteId === playerId && game.result === "1-0") ||
          (game.blackId === playerId && game.result === "0-1");
        if (won) {
          total.wins += 1;
          total.points += 3;
        } else {
          total.losses += 1;
        }
        return total;
      },
      { wins: 0, losses: 0, draws: 0, points: 0 },
    );

  return stats;
}
