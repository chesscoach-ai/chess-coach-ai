import "server-only";

const messages: Record<string, string> = {
  AUTH_REQUIRED: "Connecte-toi pour accéder à cette fonctionnalité.",
  BILLING_NOT_CONFIGURED:
    "Le paiement sera disponible dès que Stripe aura été configuré.",
  BILLING_PRICE_INVALID:
    "Le tarif Stripe doit être configuré à 2 € par mois.",
  SUBSCRIPTION_REQUIRED:
    "Un abonnement Analyse est nécessaire pour utiliser cette fonction.",
  CUSTOMER_NOT_FOUND:
    "Aucun abonnement à gérer n’a été trouvé pour ce compte.",
  INVALID_WEBHOOK: "La signature du paiement est invalide.",
};

const statuses: Record<string, number> = {
  AUTH_REQUIRED: 401,
  SUBSCRIPTION_REQUIRED: 403,
  CUSTOMER_NOT_FOUND: 404,
  BILLING_NOT_CONFIGURED: 503,
  BILLING_PRICE_INVALID: 503,
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
