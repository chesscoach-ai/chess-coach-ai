import { z } from "zod";

import { communityErrorResponse } from "@/lib/community/apiResponse";
import { setCommunityProgressSharing } from "@/lib/community/communityStore";
import { noStoreJson } from "@/lib/multiplayer/apiResponse";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

const privacySchema = z.object({ shareProgress: z.boolean() });

export async function PATCH(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const parsed = privacySchema.safeParse(await request.json());
    if (!parsed.success) throw new Error("INVALID_REQUEST");
    await setCommunityProgressSharing(player, parsed.data.shareProgress);
    return noStoreJson({ success: true });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
