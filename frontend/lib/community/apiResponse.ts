import "server-only";

const messages: Record<string, { status: number; message: string }> = {
  AUTH_REQUIRED: {
    status: 401,
    message: "Connecte-toi pour accéder à la communauté.",
  },
  INVALID_REQUEST: {
    status: 400,
    message: "Les informations envoyées sont invalides.",
  },
  AVATAR_LOCKED: {
    status: 403,
    message: "Ton Elo n’est pas encore assez élevé pour cet avatar.",
  },
  PLAYER_NOT_FOUND: {
    status: 404,
    message: "Aucun joueur correspondant n’a été trouvé.",
  },
  CLAN_NOT_FOUND: {
    status: 404,
    message: "Ce clan est introuvable.",
  },
  CLAN_CONFLICT: {
    status: 409,
    message: "Tu appartiens déjà à un clan ou ce tag est indisponible.",
  },
};

export function communityErrorResponse(error: unknown): Response {
  const code =
    error instanceof Error && error.message in messages
      ? error.message
      : "INTERNAL_ERROR";
  const resolved = messages[code] ?? {
    status: 500,
    message: "L’espace communauté est momentanément indisponible.",
  };
  return Response.json(
    { error: code, message: resolved.message },
    { status: resolved.status },
  );
}
