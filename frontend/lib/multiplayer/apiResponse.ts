import "server-only";

const statusByCode: Record<string, number> = {
  AUTH_REQUIRED: 401,
  GAME_FORBIDDEN: 403,
  GAME_NOT_FOUND: 404,
  CANNOT_JOIN_OWN_GAME: 409,
  GAME_ALREADY_STARTED: 409,
  GAME_NOT_ACTIVE: 409,
  DRAW_OFFER_PENDING: 409,
  DRAW_OFFER_NOT_FOUND: 409,
  DRAW_OFFER_OWN: 409,
  NOT_YOUR_TURN: 409,
  TIME_EXPIRED: 409,
  ILLEGAL_MOVE: 422,
  INVALID_REQUEST: 400,
  GAME_NOT_FINISHED: 409,
  REVIEW_LIMIT_REACHED: 402,
  PUSH_NOT_CONFIGURED: 503,
  PUSH_SUBSCRIPTION_REQUIRED: 404,
  PUSH_SEND_FAILED: 502,
  REWARD_NOT_READY: 409,
  REWARD_ALREADY_CLAIMED: 409,
  BANNER_SHARDS_MISSING: 409,
  BANNER_LOCKED: 403,
  SUBSCRIPTION_REQUIRED: 403,
};

const messageByCode: Record<string, string> = {
  AUTH_REQUIRED: "Connecte-toi pour jouer en ligne.",
  GAME_FORBIDDEN: "Cette partie ne t’appartient pas.",
  GAME_NOT_FOUND: "Invitation ou partie introuvable.",
  CANNOT_JOIN_OWN_GAME: "Partage ce code avec un autre joueur.",
  GAME_ALREADY_STARTED: "Cette invitation a déjà été utilisée.",
  GAME_NOT_ACTIVE: "Cette partie n’est pas en cours.",
  DRAW_OFFER_PENDING: "Une proposition de nulle attend déjà une réponse.",
  DRAW_OFFER_NOT_FOUND: "Cette proposition de nulle n’est plus disponible.",
  DRAW_OFFER_OWN: "Seul ton adversaire peut répondre à ta proposition.",
  NOT_YOUR_TURN: "Attends le coup de ton adversaire.",
  TIME_EXPIRED: "La pendule est arrivée à zéro.",
  ILLEGAL_MOVE: "Ce coup n’est pas autorisé dans cette position.",
  INVALID_REQUEST: "Les informations envoyées sont invalides.",
  GAME_NOT_FINISHED: "Le bilan est disponible uniquement après la fin de la partie.",
  REVIEW_LIMIT_REACHED:
    "Tes trois bilans gratuits ont été utilisés. Coach+ à 2,99 € par mois débloque les bilans illimités.",
  PUSH_NOT_CONFIGURED:
    "Les notifications mobiles ne sont pas encore configurées sur ce serveur.",
  PUSH_SUBSCRIPTION_REQUIRED:
    "Active d’abord les rappels sur cet appareil.",
  PUSH_SEND_FAILED:
    "Le pigeon messager s’est perdu. Réessaie dans un instant.",
  REWARD_NOT_READY:
    "Il manque encore quelques couronnes avant d’ouvrir ce coffre.",
  REWARD_ALREADY_CLAIMED:
    "Ce coffre a déjà rejoint ta collection aujourd’hui.",
  BANNER_SHARDS_MISSING:
    "Il manque encore quelques éclats pour forger cette bannière.",
  BANNER_LOCKED:
    "Cette bannière doit d’abord être forgée avant de l’équiper.",
  SUBSCRIPTION_REQUIRED:
    "Coach+ est nécessaire pour accéder aux exercices accompagnés.",
};

export function multiplayerErrorResponse(error: unknown): Response {
  const code =
    error instanceof Error && error.message in statusByCode
      ? error.message
      : "INTERNAL_ERROR";

  return Response.json(
    {
      error: code,
      message:
        messageByCode[code] ??
        "Une erreur empêche momentanément la partie de continuer.",
    },
    { status: statusByCode[code] ?? 500 },
  );
}

export function noStoreJson(value: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(value, { ...init, headers });
}
