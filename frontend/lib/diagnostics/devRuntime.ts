import "server-only";

import { fetchBackend } from "@/lib/api/backendServer";
import type { DevRuntimeDiagnosticPayload } from "@/types/devRuntimeDiagnostics";

type BackendResult = {
  ok: boolean;
  status: number | null;
  data: Record<string, unknown> | null;
};

async function readBackend(path: string): Promise<BackendResult> {
  try {
    const response = await fetchBackend(path, {
      headers: { Accept: "application/json" },
    });
    const data = (await response.json()) as Record<string, unknown>;
    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch {
    return {
      ok: false,
      status: null,
      data: null,
    };
  }
}

export async function collectDevRuntimeDiagnostics(): Promise<DevRuntimeDiagnosticPayload> {
  const [
    readiness,
    runtimeMetrics,
    runtimeCache,
    runtimeDatabase,
    runtimeNoxAi,
  ] = await Promise.all([
    readBackend("/ready"),
    readBackend("/runtime/metrics"),
    readBackend("/runtime/cache"),
    readBackend("/runtime/database"),
    readBackend("/runtime/nox-ai"),
  ]);

  return {
    collectedAt: new Date().toISOString(),
    frontend: {
      status: "ready",
      environment: process.env.NODE_ENV,
    },
    backend: {
      status: readiness.ok ? "ready" : "unavailable",
      httpStatus: readiness.status,
    },
    stockfish: readiness.data,
    metrics: runtimeMetrics.data,
    database: {
      status:
        typeof runtimeDatabase.data?.status === "string"
          ? runtimeDatabase.data.status
          : "indisponible",
      type:
        typeof runtimeDatabase.data?.backend === "string"
          ? runtimeDatabase.data.backend
          : "inconnu",
      urlDetected: runtimeDatabase.data?.database_url_detected === true,
      migrationStatus:
        typeof runtimeDatabase.data?.status === "string"
          ? runtimeDatabase.data.status
          : "indisponible",
      currentVersion:
        typeof runtimeDatabase.data?.current_version === "string"
          ? runtimeDatabase.data.current_version
          : null,
      headVersion:
        typeof runtimeDatabase.data?.head_version === "string"
          ? runtimeDatabase.data.head_version
          : null,
      cacheTablePresent:
        typeof runtimeDatabase.data?.cache_table_present === "boolean"
          ? runtimeDatabase.data.cache_table_present
          : null,
    },
    cache: runtimeCache.data,
    noxAi: runtimeNoxAi.data,
  };
}
