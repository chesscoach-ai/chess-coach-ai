import { billingErrorResponse } from "@/lib/billing/apiResponse";
import { getBillingSubscription } from "@/lib/billing/subscriptionStore";
import { getStripe, getStripePriceId } from "@/lib/billing/stripeClient";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const stripe = getStripe();
    const existing = await getBillingSubscription(player.id);
    const origin = new URL(request.url).origin;
    const priceId = getStripePriceId();
    const price = await stripe.prices.retrieve(priceId);
    if (
      price.unit_amount !== 200 ||
      price.currency !== "eur" ||
      price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1
    ) {
      throw new Error("BILLING_PRICE_INVALID");
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "fr",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=canceled`,
      client_reference_id: player.id,
      customer: existing?.customerId,
      customer_email: existing?.customerId ? undefined : player.id,
      metadata: { userId: player.id },
      subscription_data: {
        metadata: { userId: player.id },
      },
    });

    if (!session.url) throw new Error("BILLING_ERROR");
    return Response.json({ url: session.url });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
