import { z } from "zod";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { getActiveNoxMission, recordNoxMissionResult, startNoxMission } from "@/lib/nox/missionStore";
import { NOX_CONCEPT_IDS } from "@/lib/nox/memoryTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), missionId: z.string().min(3) }),
  z.object({ action: z.literal("result"), missionId: z.string().min(3), exerciseId: z.string().min(3), success: z.boolean(), mistakes: z.number().int().min(0).max(100), hintsUsed: z.number().int().min(0).max(100) }),
  z.object({ action: z.literal("dev_generate"), conceptId: z.enum(NOX_CONCEPT_IDS) }),
  z.object({ action: z.literal("dev_complete"), missionId: z.string().min(3) }),
]);

export async function GET() {
  const mission = await getActiveNoxMission(await getAuthenticatedPlayer());
  return Response.json(mission, { headers: {
    "Cache-Control": "no-store",
    "Set-Cookie": `knightly_mission_access=${encodeURIComponent(mission.id)}; Path=/exercises/training; HttpOnly; SameSite=Strict; Max-Age=3600${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  } });
}

export async function POST(request: Request) {
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ message: "Action de mission invalide." }, { status: 400 });
  if (parsed.data.action === "dev_generate" || parsed.data.action === "dev_complete") {
    if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  }
  const player = await getAuthenticatedPlayer();
  if (parsed.data.action === "dev_generate" || parsed.data.action === "dev_complete") {
    if (!player) return Response.json({ message: "Connexion requise." }, { status: 401 });
    if (parsed.data.action === "dev_generate") return Response.json(await getActiveNoxMission(player, { forcedConcept: parsed.data.conceptId }));
    let mission = await startNoxMission(player, parsed.data.missionId);
    for (const exerciseId of mission.exerciseIds) mission = await recordNoxMissionResult(player, { missionId: mission.id, exerciseId, success: true, mistakes: 0, hintsUsed: 0 });
    return Response.json(mission);
  }
  if (!player) return Response.json({ message: "Mission découverte non persistante." }, { status: 401 });
  try {
    return Response.json(parsed.data.action === "start"
      ? await startNoxMission(player, parsed.data.missionId)
      : await recordNoxMissionResult(player, parsed.data));
  } catch {
    return Response.json({ message: "Mission introuvable." }, { status: 404 });
  }
}
