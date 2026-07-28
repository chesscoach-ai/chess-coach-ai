import { z } from "zod";

import { communityErrorResponse } from "@/lib/community/apiResponse";
import {
  createCommunityClan,
  joinCommunityClan,
} from "@/lib/community/communityStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { noStoreJson } from "@/lib/multiplayer/apiResponse";

export const runtime = "nodejs";

const clanSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(3).max(60),
    tag: z.string().trim().min(2).max(8),
  }),
  z.object({
    action: z.literal("join"),
    tag: z.string().trim().min(2).max(8),
  }),
]);

export async function POST(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const parsed = clanSchema.safeParse(await request.json());
    if (!parsed.success) throw new Error("INVALID_REQUEST");
    if (parsed.data.action === "create") {
      await createCommunityClan(
        player,
        parsed.data.name,
        parsed.data.tag,
      );
    } else {
      await joinCommunityClan(player, parsed.data.tag);
    }
    return noStoreJson({ success: true });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
