import { z } from "zod";

import {
  multiplayerErrorResponse,
  noStoreJson,
} from "@/lib/multiplayer/apiResponse";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import {
  isPushConfigured,
  isValidTimeZone,
  removePushSubscription,
  savePushSubscription,
} from "@/lib/push/pushStore";

export const runtime = "nodejs";

const endpointSchema = z
  .string()
  .url()
  .max(2_048);

const subscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    auth: z.string().min(8).max(256),
    p256dh: z
      .string()
      .min(16)
      .max(512),
  }),
  reminderTime: z
    .string()
    .regex(
      /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    ),
  timezone: z
    .string()
    .min(1)
    .max(100)
    .refine(isValidTimeZone),
});

const deleteSchema = z.object({
  endpoint: endpointSchema,
});

export async function POST(
  request: Request,
) {
  try {
    const player =
      await getAuthenticatedPlayer();
    if (!player) {
      throw new Error(
        "AUTH_REQUIRED",
      );
    }
    if (!isPushConfigured()) {
      throw new Error(
        "PUSH_NOT_CONFIGURED",
      );
    }
    const parsed =
      subscriptionSchema.safeParse(
        await request.json(),
      );
    if (!parsed.success) {
      throw new Error(
        "INVALID_REQUEST",
      );
    }
    await savePushSubscription(
      player,
      parsed.data,
    );
    return noStoreJson(
      { subscribed: true },
      { status: 201 },
    );
  } catch (error) {
    return multiplayerErrorResponse(
      error,
    );
  }
}

export async function DELETE(
  request: Request,
) {
  try {
    const player =
      await getAuthenticatedPlayer();
    if (!player) {
      throw new Error(
        "AUTH_REQUIRED",
      );
    }
    const parsed =
      deleteSchema.safeParse(
        await request.json(),
      );
    if (!parsed.success) {
      throw new Error(
        "INVALID_REQUEST",
      );
    }
    await removePushSubscription(
      player.id,
      parsed.data.endpoint,
    );
    return noStoreJson({
      subscribed: false,
    });
  } catch (error) {
    return multiplayerErrorResponse(
      error,
    );
  }
}
