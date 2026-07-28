import "server-only";

const statusByCode: Record<string, number> = {
  AUTH_REQUIRED: 401,
  GAME_FORBIDDEN: 403,
  GAME_NOT_FOUND: 404,
  CANNOT_JOIN_OWN_GAME: 409,
  GAME_ALREADY_STARTED: 409,
  GAME_NOT_ACTIVE: 409,
  NOT_YOUR_TURN: 409,
  TIME_EXPIRED: 409,
  ILLEGAL_MOVE: 422,
  INVALID_REQUEST: 400,
  GAME_NOT_FINISHED: 409,
  REVIEW_LIMIT_REACHED: 402,
};

const messageByCode: Record<string, string> = {
  AUTH_REQUIRED: "Connecte-toi pour jouer en ligne.",
  GAME_FORBIDDEN: "Cette partie ne t’appartient pas.",
  GAME_NOT_FOUND: "Invitation ou partie introuvable.",
  CANNOT_JOIN_OWN_GAME: "Partage ce code avec un autre joueur.",
  GAME_ALREADY_STARTED: "Cette invitation a déjà été utilisée.",
  GAME_NOT_ACTIVE: "Cette partie n’est pas en cours.",
  NOT_YOUR_TURN: "Attends le coup de ton adversaire.",
  TIME_EXPIRED: "La pendule est arrivée à zéro.",
  ILLEGAL_MOVE: "Ce coup n’est pas autorisé dans cette position.",
  INVALID_REQUEST: "Les informations envoyées sont invalides.",
  GAME_NOT_FINISHED: "Le bilan est disponible uniquement après la fin de la partie.",
  REVIEW_LIMIT_REACHED:
    "Tes trois bilans gratuits ont été utilisés. L’abonnement Analyse à 2 € par mois débloque les bilans illimités.",
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
