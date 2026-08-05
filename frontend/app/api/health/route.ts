import { getCommercialReadiness } from "@/lib/commercial/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isConfigured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  const production =
    process.env.NODE_ENV === "production";
  const required = {
    database: isConfigured("DATABASE_URL"),
    authentication: isConfigured("AUTH_SECRET"),
    chessEngine: isConfigured("BACKEND_URL"),
    engineProtection: isConfigured(
      "BACKEND_API_SECRET",
    ),
  };
  const googleParts = [
    isConfigured("AUTH_GOOGLE_ID"),
    isConfigured("AUTH_GOOGLE_SECRET"),
  ];
  const pushParts = [
    isConfigured("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
    isConfigured("VAPID_PRIVATE_KEY"),
    isConfigured("VAPID_SUBJECT"),
  ];
  const missingRequired = production
    ? Object.entries(required)
        .filter(([, configured]) => !configured)
        .map(([name]) => name)
    : [];
  const commercial =
    getCommercialReadiness();
  if (
    production &&
    commercial.launchEnabled &&
    !commercial.ready
  ) {
    missingRequired.push(
      ...commercial.missing.map(
        (name) => `commercial:${name}`,
      ),
    );
  }
  const status =
    missingRequired.length === 0 ? "ok" : "not_ready";

  return Response.json(
    {
      status,
      service: "chess-coach-web",
      release:
        process.env.RENDER_GIT_COMMIT?.slice(0, 7) ??
        "local",
      configuration: {
        required,
        googleOAuth:
          googleParts.every(Boolean)
            ? "ready"
            : googleParts.some(Boolean)
              ? "incomplete"
              : "disabled",
        webPush:
          pushParts.every(Boolean)
            ? "ready"
            : pushParts.some(Boolean)
              ? "incomplete"
              : "disabled",
        commercial: {
          launchEnabled:
            commercial.launchEnabled,
          ready: commercial.ready,
          priceMonthlyCents:
            commercial.priceMonthlyCents,
          priceAnnualCents:
            commercial.priceAnnualCents,
          missing: commercial.missing,
        },
      },
      missingRequired,
    },
    {
      status:
        missingRequired.length === 0 ? 200 : 503,
      headers: {
        "Cache-Control":
          "no-store, max-age=0, must-revalidate",
      },
    },
  );
}
