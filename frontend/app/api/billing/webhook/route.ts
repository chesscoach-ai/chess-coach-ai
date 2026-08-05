import type Stripe from "stripe";

import { billingErrorResponse } from "@/lib/billing/apiResponse";
import { saveBillingSubscription } from "@/lib/billing/subscriptionStore";
import type { SubscriptionStatus } from "@/lib/billing/types";
import { getStripe } from "@/lib/billing/stripeClient";
import { isDeletedSubscription } from "@/lib/privacy/accountData";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !webhookSecret) {
      throw new Error("INVALID_WEBHOOK");
    }

    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (subscriptionId) {
        await persistStripeSubscription(
          await stripe.subscriptions.retrieve(subscriptionId),
          session.metadata?.userId ?? session.client_reference_id ?? null,
        );
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await persistStripeSubscription(
        event.data.object,
        event.data.object.metadata.userId ?? null,
      );
    }

    return Response.json({ received: true });
  } catch (error) {
    return billingErrorResponse(
      error instanceof Error && error.message === "INVALID_WEBHOOK"
        ? error
        : new Error("INVALID_WEBHOOK"),
    );
  }
}

async function persistStripeSubscription(
  subscription: Stripe.Subscription,
  userId: string | null,
): Promise<void> {
  if (!userId) return;
  if (await isDeletedSubscription(subscription.id)) {
    return;
  }
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const periodEnd = getCurrentPeriodEnd(subscription);

  await saveBillingSubscription({
    userId: userId.trim().toLocaleLowerCase("fr"),
    customerId,
    subscriptionId: subscription.id,
    status: normalizeStatus(subscription.status),
    currentPeriodEnd: periodEnd
      ? new Date(periodEnd * 1_000).toISOString()
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription): number | null {
  const periods = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");
  return periods.length > 0 ? Math.max(...periods) : null;
}

function normalizeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (
    status === "trialing" ||
    status === "active" ||
    status === "past_due" ||
    status === "unpaid" ||
    status === "paused" ||
    status === "canceled"
  ) {
    return status;
  }
  return "inactive";
}
