const SAFE_ROUTE =
  /^\/(?:$|auth(?:\/|$)|account(?:\/|$)|exercises(?:\/|$)|legal(?:\/|$)|multiplayer(?:\/|$))/;

export function resolveMobileRoute(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol === "chessclan:") {
      return resolveCustomScheme(url);
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const route = `${url.pathname}${url.search}`;
    return SAFE_ROUTE.test(route) ? route : null;
  } catch {
    return null;
  }
}

function resolveCustomScheme(url: URL): string | null {
  const action = url.hostname.toLowerCase();
  if (action === "join") {
    const code = url.pathname
      .replace(/^\/+/, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    if (code.length < 6) return null;
    return `/?mode=multiplayer&kind=friend&invite=${encodeURIComponent(code)}`;
  }
  if (action === "play") {
    const kind = url.pathname.replace(/^\/+/, "");
    if (kind === "online" || kind === "friend" || kind === "ai") {
      return `/?mode=multiplayer&kind=${kind}`;
    }
    return "/?mode=multiplayer";
  }
  if (action === "coach") return "/?mode=analysis";
  if (action === "exercises") return "/?mode=exercises";
  if (action === "account") return "/account";
  return null;
}
