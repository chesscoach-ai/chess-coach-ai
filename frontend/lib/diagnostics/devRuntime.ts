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
  const [readiness, runtimeMetrics] = await Promise.all([
    readBackend("/ready"),
    readBackend("/runtime/metrics"),
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
      status: process.env.DATABASE_URL ? "configured" : "local-mode",
      type: process.env.DATABASE_URL ? "PostgreSQL" : "fichiers locaux",
    },
    cache: {
      l1: "mémoire du processus",
      l2: "non instrumenté",
    },
  };
}
