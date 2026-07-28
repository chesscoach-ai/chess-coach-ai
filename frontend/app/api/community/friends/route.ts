import { z } from "zod";

import { communityErrorResponse } from "@/lib/community/apiResponse";
import { addCommunityFriend } from "@/lib/community/communityStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { noStoreJson } from "@/lib/multiplayer/apiResponse";

export const runtime = "nodejs";

const friendSchema = z.object({
  query: z.string().trim().min(2).max(320),
});

export async function POST(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const parsed = friendSchema.safeParse(await request.json());
    if (!parsed.success) throw new Error("INVALID_REQUEST");
    await addCommunityFriend(player, parsed.data.query);
    return noStoreJson({ success: true });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
