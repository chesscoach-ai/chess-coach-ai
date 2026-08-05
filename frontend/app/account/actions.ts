"use server";

import { signOut } from "@/auth";
import {
  getBillingSubscription,
} from "@/lib/billing/subscriptionStore";
import {
  getStripe,
  isStripeConfigured,
} from "@/lib/billing/stripeClient";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { deleteAccountData } from "@/lib/privacy/accountData";

export type DeleteAccountState = {
  error?: string;
};

export async function deleteAccount(
  _previous: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const player = await getAuthenticatedPlayer();
  if (!player) {
    return { error: "Reconnecte-toi avant de supprimer le compte." };
  }
  const confirmation = String(
    formData.get("confirmation") ?? "",
  )
    .trim()
    .toLocaleLowerCase("fr");
  if (confirmation !== player.id) {
    return {
      error:
        "Saisis exactement ton adresse e-mail pour confirmer.",
    };
  }

  try {
    const subscription =
      await getBillingSubscription(player.id);
    if (
      subscription &&
      subscription.status !== "canceled"
    ) {
      if (!isStripeConfigured()) {
        return {
          error:
            "L’abonnement doit d’abord être annulé. Contacte le support.",
        };
      }
      await getStripe().subscriptions.cancel(
        subscription.subscriptionId,
      );
    }
    await deleteAccountData(
      player.id,
      subscription?.subscriptionId ?? null,
    );
  } catch {
    return {
      error:
        "La suppression n’a pas abouti. Aucune suppression partielle n’a été validée.",
    };
  }

  await signOut({
    redirectTo: "/?account=deleted",
  });
  return {};
}
