import { createHash } from "node:crypto";

import type { AiLevelId, AiPersonaId } from "@/lib/ai/opponents";
import { getAiLevel } from "@/lib/ai/opponents";
import type { MoveAnalysis } from "@/services/api/ApiService";

export function selectAiMove(input: {
  fen: string;
  levelId: AiLevelId;
  personaId: AiPersonaId;
  moves: MoveAnalysis[];
}): MoveAnalysis {
  if (input.moves.length === 0) throw new Error("NO_AI_MOVE");
  const level = getAiLevel(input.levelId);
  const candidates = input.moves.slice(0, level.candidateCount);
  const ranked = candidates
    .map((move) => ({
      move,
      score:
        personaScore(move, input.personaId) -
        intentionalImprecision(move.rank, level.candidateCount, input.fen),
    }))
    .sort((first, second) => second.score - first.score);
  return ranked[0]?.move ?? input.moves[0];
}

function personaScore(move: MoveAnalysis, personaId: AiPersonaId): number {
  const base = 100 - move.rank * 12;
  switch (personaId) {
    case "tal":
      return (
        base +
        (move.gives_check ? 22 : 0) +
        (move.is_capture ? 12 : 0) +
        (move.gives_checkmate ? 100 : 0)
      );
    case "petrosian":
      return (
        base +
        (move.is_castling ? 18 : 0) +
        (!move.is_capture && !move.gives_check ? 8 : 0)
      );
    case "capablanca":
      return (
        base +
        (move.is_castling ? 12 : 0) +
        (!move.gives_check ? 5 : 0) +
        Math.min(move.strategic_ideas.length, 3) * 3
      );
    case "fischer":
      return base + (move.gives_check ? 9 : 0) + (move.rank === 1 ? 10 : 0);
    case "carlsen":
      return (
        base +
        (!move.is_capture ? 7 : 0) +
        Math.min(move.strategic_ideas.length, 4) * 4
      );
    case "balanced":
      return base + Math.min(move.strategic_ideas.length, 3) * 2;
  }
}

function intentionalImprecision(
  rank: number,
  candidateCount: number,
  fen: string,
): number {
  if (candidateCount <= 1) return 0;
  const byte = createHash("sha256").update(`${fen}-${rank}`).digest()[0] ?? 0;
  const variation = byte / 255;
  return rank === 1 ? variation * candidateCount * 10 : (1 - variation) * 6;
}
