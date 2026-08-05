import { z } from "zod";

import {
  multiplayerErrorResponse,
  noStoreJson,
} from "@/lib/multiplayer/apiResponse";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import {
  selectBattleBanner,
  unlockBattleBanner,
} from "@/lib/rewards/battleRewardStore";
import { isBattleBannerId } from "@/lib/rewards/banners";

export const runtime = "nodejs";

const cosmeticSchema = z.object({
  action: z.enum(["unlock", "equip"]),
  bannerId: z.string().refine(isBattleBannerId),
});

export async function POST(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const parsed = cosmeticSchema.safeParse(await request.json());
    if (!parsed.success) throw new Error("INVALID_REQUEST");

    return noStoreJson({
      rewards:
        parsed.data.action === "unlock"
          ? await unlockBattleBanner(player, parsed.data.bannerId)
          : await selectBattleBanner(player, parsed.data.bannerId),
    });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}
