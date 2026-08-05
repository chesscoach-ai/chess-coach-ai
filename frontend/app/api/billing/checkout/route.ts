import { z } from "zod";

import { billingErrorResponse } from "@/lib/billing/apiResponse";
import { getBillingSubscription } from "@/lib/billing/subscriptionStore";
import { getStripe, getStripePriceId } from "@/lib/billing/stripeClient";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import {
  assertCommercialLaunchReady,
  getAnalysisPriceAnnualCents,
  getAnalysisPriceMonthlyCents,
} from "@/lib/commercial/config";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  plan: z.enum(["monthly", "annual"]).default("monthly"),
});

export async function POST(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    assertCommercialLaunchReady();
    const stripe = getStripe();
    const existing = await getBillingSubscription(player.id);
    if (
      existing?.status === "active" ||
      existing?.status === "trialing"
    ) {
      throw new Error("SUBSCRIPTION_ALREADY_ACTIVE");
    }
    const payload = await request.json().catch(() => ({}));
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) throw new Error("INVALID_REQUEST");
    const plan = parsed.data.plan;
    const origin = new URL(request.url).origin;
    const priceId = getStripePriceId(plan);
    const price = await stripe.prices.retrieve(priceId);
    const expectedAmount =
      plan === "annual"
        ? getAnalysisPriceAnnualCents()
        : getAnalysisPriceMonthlyCents();
    const expectedInterval =
      plan === "annual" ? "year" : "month";
    if (
      price.unit_amount !== expectedAmount ||
      price.currency !== "eur" ||
      price.recurring?.interval !== expectedInterval ||
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
      metadata: { userId: player.id, plan },
      subscription_data: {
        metadata: { userId: player.id, plan },
      },
    });

    if (!session.url) throw new Error("BILLING_ERROR");
    return Response.json({ url: session.url });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
