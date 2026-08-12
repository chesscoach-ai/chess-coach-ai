import "server-only";

const messages: Record<string, string> = {
  COMMERCIAL_LAUNCH_DISABLED:
    "Les abonnements ne sont pas encore ouverts.",
  COMMERCIAL_LAUNCH_NOT_READY:
    "Le lancement commercial doit encore être validé.",
  SUBSCRIPTION_ALREADY_ACTIVE:
    "Ce compte possède déjà un abonnement actif.",
  AUTH_REQUIRED: "Connecte-toi pour accéder à cette fonctionnalité.",
  BILLING_NOT_CONFIGURED:
    "Le paiement sera disponible dès que Stripe aura été configuré.",
  BILLING_PRICE_INVALID:
    "Les tarifs Stripe doivent correspondre aux offres Knightly+ configurées.",
  INVALID_REQUEST:
    "La formule d’abonnement sélectionnée est invalide.",
  SUBSCRIPTION_REQUIRED:
    "Un abonnement Knightly+ est nécessaire pour utiliser cette fonction.",
  CUSTOMER_NOT_FOUND:
    "Aucun abonnement à gérer n’a été trouvé pour ce compte.",
  INVALID_WEBHOOK: "La signature du paiement est invalide.",
};

const statuses: Record<string, number> = {
  COMMERCIAL_LAUNCH_DISABLED: 503,
  COMMERCIAL_LAUNCH_NOT_READY: 503,
  SUBSCRIPTION_ALREADY_ACTIVE: 409,
  AUTH_REQUIRED: 401,
  SUBSCRIPTION_REQUIRED: 403,
  CUSTOMER_NOT_FOUND: 404,
  BILLING_NOT_CONFIGURED: 503,
  BILLING_PRICE_INVALID: 503,
  INVALID_REQUEST: 400,
  INVALID_WEBHOOK: 400,
};

export function billingErrorResponse(error: unknown): Response {
  const code =
    error instanceof Error && error.message in messages
      ? error.message
      : "BILLING_ERROR";
  return Response.json(
    {
      error: code,
      message:
        messages[code] ??
        "Le service d’abonnement est momentanément indisponible.",
    },
    { status: statuses[code] ?? 500 },
  );
}
