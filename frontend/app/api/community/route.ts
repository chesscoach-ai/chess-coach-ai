import {
  communityErrorResponse,
} from "@/lib/community/apiResponse";
import { getCommunityDashboard } from "@/lib/community/communityStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { noStoreJson } from "@/lib/multiplayer/apiResponse";

export const runtime = "nodejs";

export async function GET() {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    return noStoreJson({
      dashboard: await getCommunityDashboard(player),
    });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
