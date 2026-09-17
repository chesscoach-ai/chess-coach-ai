import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { getNoxMemoryEvidence } from "@/lib/nox/memoryStore";

export const dynamic = "force-dynamic";

/** Only existing learning evidence; no new behavioural history is recorded. */
export async function GET() {
  const player = await getAuthenticatedPlayer();
  if (!player) return Response.json({ sessionCompletedAt: [] });
  const { events } = await getNoxMemoryEvidence(player);
  const cutoff = Date.now() - 8 * 86_400_000;
  const sessions = new Map(events.filter(event => event.type === "mission_completed" && Date.parse(event.occurredAt) >= cutoff).map(event => [event.sourceId, event.occurredAt]));
  return Response.json({ sessionCompletedAt: [...sessions.values()] }, { headers: { "Cache-Control": "no-store" } });
}
