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
