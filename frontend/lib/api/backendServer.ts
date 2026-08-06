export function getBackendUrl(): string {
  return (
    process.env.BACKEND_URL ??
    (process.env.BACKEND_HOSTPORT
      ? `http://${process.env.BACKEND_HOSTPORT}`
      : "http://127.0.0.1:8000")
  ).replace(/\/$/, "");
}

export function getBackendHeaders(
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  const secret =
    process.env.BACKEND_API_SECRET?.trim();

  return {
    ...extraHeaders,
    ...(secret
      ? {
          "X-Backend-Api-Secret": secret,
        }
      : {}),
  };
}

const BACKEND_RETRY_DELAYS_MS = [0, 2_000, 5_000, 10_000, 15_000];
const RETRYABLE_BACKEND_STATUSES = new Set([502, 503, 504]);

/**
 * Appelle le moteur en tolérant le réveil d'une instance Render gratuite.
 * Le premier 503 est souvent transitoire : il déclenche le démarrage du
 * conteneur, puis les tentatives suivantes récupèrent la réponse utile.
 */
export async function fetchBackend(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (const delayMs of BACKEND_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    try {
      const response = await fetch(`${getBackendUrl()}${path}`, {
        ...init,
        headers: getBackendHeaders(
          Object.fromEntries(new Headers(init.headers).entries()),
        ),
        cache: "no-store",
        signal: AbortSignal.timeout(55_000),
      });

      if (!RETRYABLE_BACKEND_STATUSES.has(response.status)) {
        return response;
      }
      lastResponse = response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error
    ? lastError
    : new Error("Le moteur d’analyse ne répond pas.");
}
