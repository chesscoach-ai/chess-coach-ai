import { z } from "zod";

import { communityErrorResponse } from "@/lib/community/apiResponse";
import {
  createCommunityClan,
  joinCommunityClan,
  leaveCommunityClan,
  rotateCommunityClanInvite,
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
    inviteCode: z.string().trim().min(2).max(16),
  }),
  z.object({ action: z.literal("rotate-invite") }),
  z.object({ action: z.literal("leave") }),
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
    } else if (parsed.data.action === "join") {
      await joinCommunityClan(player, parsed.data.inviteCode);
    } else if (parsed.data.action === "rotate-invite") {
      return noStoreJson({ success: true, inviteCode: await rotateCommunityClanInvite(player) });
    } else {
      return noStoreJson({ success: true, outcome: await leaveCommunityClan(player) });
    }
    return noStoreJson({ success: true });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
