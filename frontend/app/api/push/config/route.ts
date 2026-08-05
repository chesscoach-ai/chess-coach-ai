import {
  getPushPublicKey,
  isPushConfigured,
} from "@/lib/push/pushStore";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(
    {
      configured:
        isPushConfigured(),
      publicKey: getPushPublicKey(),
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}
