import { z } from "zod";

import { billingErrorResponse } from "@/lib/billing/apiResponse";
import { getAnalysisEntitlement } from "@/lib/billing/subscriptionStore";
import { recordLearningSession } from "@/lib/learning/profileStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

const sessionSchema = z.object({
  moves: z.array(z.string().min(1).max(20)).min(1).max(600),
  reviews: z
    .array(
      z.object({
        moveIndex: z.number().int().min(0).max(599),
        classification: z.enum([
          "excellent",
          "good",
          "inaccuracy",
          "mistake",
          "blunder",
        ]),
        evaluationLoss: z.number().finite().min(0).max(100),
        isCapture: z.boolean(),
        bestVariation: z.array(z.string().max(20)).max(30),
      }),
    )
    .min(1)
    .max(600),
});

export async function POST(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const entitlement = await getAnalysisEntitlement(player.id);
    if (!entitlement.hasAccess) throw new Error("SUBSCRIPTION_REQUIRED");
    const parsed = sessionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { message: "Les données de cette analyse sont invalides." },
        { status: 400 },
      );
    }
    return Response.json({
      profile: await recordLearningSession(player, parsed.data),
    });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
