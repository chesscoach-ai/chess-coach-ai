import {
  timingSafeEqual,
} from "node:crypto";

import { noStoreJson } from "@/lib/multiplayer/apiResponse";
import { dispatchDuePushes } from "@/lib/push/pushStore";

export const runtime = "nodejs";

export async function POST(
  request: Request,
) {
  if (
    !hasValidCronSecret(
      request.headers.get(
        "authorization",
      ),
    )
  ) {
    return noStoreJson(
      {
        error: "CRON_FORBIDDEN",
        message:
          "Ce déclencheur est réservé au planificateur.",
      },
      { status: 403 },
    );
  }

  try {
    return noStoreJson(
      await dispatchDuePushes(),
    );
  } catch {
    return noStoreJson(
      {
        error:
          "PUSH_DISPATCH_FAILED",
        message:
          "Les rappels n’ont pas pu être distribués.",
      },
      { status: 503 },
    );
  }
}

function hasValidCronSecret(
  authorization: string | null,
): boolean {
  const secret =
    process.env.CRON_SECRET?.trim();
  const received =
    authorization?.startsWith(
      "Bearer ",
    )
      ? authorization.slice(7)
      : "";
  if (!secret || !received) {
    return false;
  }
  const expectedBuffer =
    Buffer.from(secret);
  const receivedBuffer =
    Buffer.from(received);
  return (
    expectedBuffer.length ===
      receivedBuffer.length &&
    timingSafeEqual(
      expectedBuffer,
      receivedBuffer,
    )
  );
}
