import "server-only";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function allowBetaRequest(request: Request, scope: string, limit: number): boolean {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const identity = forwarded || "local";
  const key = `${scope}:${identity}`;
  const now = Date.now(); const current = buckets.get(key);
  if (!current || current.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 }); return true; }
  if (current.count >= limit) return false;
  current.count += 1; return true;
}
