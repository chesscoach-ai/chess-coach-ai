import { Chess, type Square } from "chess.js";
import { z } from "zod";

import {
  AI_LEVELS,
  AI_PERSONAS,
  getAiLevel,
  getAiPersona,
  type AiLevelId,
  type AiPersonaId,
} from "@/lib/ai/opponents";
import { selectAiMove } from "@/lib/ai/selectMove";
import type { PositionAnalysisResponse } from "@/services/api/ApiService";
import {
  getBackendHeaders,
  getBackendUrl,
} from "@/lib/api/backendServer";

export const runtime = "nodejs";

const requestSchema = z.object({
  fen: z.string().min(10).max(120),
  levelId: z.enum(
    AI_LEVELS.map((level) => level.id) as [
      AiLevelId,
      ...AiLevelId[],
    ],
  ),
  personaId: z.enum(
    AI_PERSONAS.map((persona) => persona.id) as [
      AiPersonaId,
      ...AiPersonaId[],
    ],
  ),
});

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { message: "Les réglages de l’adversaire sont invalides." },
        { status: 400 },
      );
    }
    const position = new Chess(parsed.data.fen);
    if (position.isGameOver()) {
      return Response.json(
        { message: "La partie est déjà terminée." },
        { status: 409 },
      );
    }

    const level = getAiLevel(parsed.data.levelId);
    const response = await fetch(`${getBackendUrl()}/analysis`, {
      method: "POST",
      headers: getBackendHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        fen: parsed.data.fen,
        depth: level.depth,
        multipv: Math.max(3, level.candidateCount),
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      return Response.json(
        { message: "L’adversaire IA ne peut pas calculer son coup." },
        { status: 502 },
      );
    }
    const analysis = (await response.json()) as PositionAnalysisResponse;
    const selected = selectAiMove({
      fen: parsed.data.fen,
      levelId: parsed.data.levelId,
      personaId: parsed.data.personaId,
      moves: analysis.top_moves,
    });
    const legalMove = position.move({
      from: selected.from_square as Square,
      to: selected.to_square as Square,
      promotion: /^[a-h][1-8][a-h][1-8][qrbn]$/.test(selected.move)
        ? selected.move[4]
        : "q",
    });
    if (!legalMove) throw new Error("NO_AI_MOVE");

    return Response.json({
      move: {
        from: legalMove.from,
        to: legalMove.to,
        san: legalMove.san,
        promotion: legalMove.promotion ?? null,
      },
      opponent: getAiPersona(parsed.data.personaId).name,
      estimatedElo: level.estimatedElo,
    });
  } catch {
    return Response.json(
      { message: "L’adversaire IA est momentanément indisponible." },
      { status: 500 },
    );
  }
}
