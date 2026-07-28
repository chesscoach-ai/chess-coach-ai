import { z } from "zod";

import { communityErrorResponse } from "@/lib/community/apiResponse";
import {
  isCommunityAvatarId,
  selectCommunityAvatar,
} from "@/lib/community/communityStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { noStoreJson } from "@/lib/multiplayer/apiResponse";

export const runtime = "nodejs";

const avatarSchema = z.object({
  avatarId: z.string().refine(isCommunityAvatarId),
});

export async function PATCH(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const parsed = avatarSchema.safeParse(await request.json());
    if (!parsed.success) throw new Error("INVALID_REQUEST");
    await selectCommunityAvatar(player, parsed.data.avatarId);
    return noStoreJson({ success: true });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
