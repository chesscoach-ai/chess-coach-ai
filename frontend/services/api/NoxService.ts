import type {
  NoxIntelligenceResult,
  ServerNoxContext,
} from "@/lib/nox/types";

const NOX_TIMEOUT_MS = 10_000;

export class NoxService {
  static async respond(
    context: ServerNoxContext,
    signal?: AbortSignal,
  ): Promise<NoxIntelligenceResult> {
    const controller = new AbortController();
    const forwardAbort = () => controller.abort();
    signal?.addEventListener("abort", forwardAbort, { once: true });
    const timeout = globalThis.setTimeout(
      () => controller.abort(),
      NOX_TIMEOUT_MS,
    );
    try {
      const response = await fetch("/api/analysis-engine/nox/respond", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(context),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Nox unavailable (${response.status})`);
      return (await response.json()) as NoxIntelligenceResult;
    } finally {
      globalThis.clearTimeout(timeout);
      signal?.removeEventListener("abort", forwardAbort);
    }
  }
}
