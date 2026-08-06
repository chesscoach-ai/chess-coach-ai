import { z } from "zod";

import { multiplayerErrorResponse, noStoreJson } from "@/lib/multiplayer/apiResponse";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import {
  removeNativePushTokens,
  saveNativePushToken,
} from "@/lib/push/nativePushStore";

export const runtime = "nodejs";

const nativeTokenSchema = z.object({
  token: z.string().min(16).max(4_096),
  platform: z.enum(["ios", "android"]),
});

export async function POST(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const parsed = nativeTokenSchema.safeParse(await request.json());
    if (!parsed.success) throw new Error("INVALID_REQUEST");
    await saveNativePushToken(player.id, parsed.data.token, parsed.data.platform);
    return noStoreJson({ subscribed: true }, { status: 201 });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    await removeNativePushTokens(player.id);
    return noStoreJson({ subscribed: false });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}
