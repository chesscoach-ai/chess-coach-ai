import { billingErrorResponse } from "@/lib/billing/apiResponse";
import { getBillingSubscription } from "@/lib/billing/subscriptionStore";
import { getStripe } from "@/lib/billing/stripeClient";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const subscription = await getBillingSubscription(player.id);
    if (!subscription?.customerId) throw new Error("CUSTOMER_NOT_FOUND");
    const origin = new URL(request.url).origin;
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.customerId,
      return_url: origin,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
