"use client";

import { useState } from "react";

import type { DevRuntimeDiagnosticPayload } from "@/types/devRuntimeDiagnostics";

function numberValue(
  source: Record<string, unknown> | null,
  key: string,
): number {
  const value = source?.[key];
  return typeof value === "number" ? value : 0;
}

function textValue(
  source: Record<string, unknown> | null,
  key: string,
  fallback = "—",
): string {
  const value = source?.[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback;
}

export default function DevRuntimeDiagnostics({
  initialPayload,
}: {
  initialPayload: DevRuntimeDiagnosticPayload;
}) {
  const [payload, setPayload] =
    useState<DevRuntimeDiagnosticPayload>(initialPayload);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dev/diagnostics", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Diagnostic indisponible (${response.status}).`);
      }
      setPayload((await response.json()) as DevRuntimeDiagnosticPayload);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Le diagnostic ne répond pas.",
      );
    } finally {
      setLoading(false);
    }
  }

  const analyses = numberValue(payload?.metrics ?? null, "total_analyses");
  const totalDuration = numberValue(
    payload?.metrics ?? null,
    "total_request_duration_ms",
  );
  const averageDuration = analyses > 0 ? totalDuration / analyses : 0;

  const cards = [
        ["API frontend", payload.frontend.status],
        ["Backend", payload.backend.status],
        ["Stockfish", textValue(payload.stockfish, "engine")],
        ["Moteurs", textValue(payload.stockfish, "pool_size")],
        ["Actifs", textValue(payload.metrics, "engines_busy", "0")],
        ["Disponibles", textValue(payload.metrics, "engines_idle", "0")],
        ["File actuelle", textValue(payload.metrics, "queue_size", "0")],
        ["Analyses totales", String(analyses)],
        ["L1 cache hits", textValue(payload.metrics, "cache_hits", "0")],
        ["Cache misses", textValue(payload.metrics, "cache_misses", "0")],
        ["Temps moyen", `${averageDuration.toFixed(0)} ms`],
        ["Timeouts", textValue(payload.metrics, "timeouts", "0")],
        ["Crashes", textValue(payload.metrics, "engine_crashes", "0")],
        ["Restarts", textValue(payload.metrics, "restarts", "0")],
        ["Base", `${payload.database.type} · ${payload.database.status}`],
        ["Cache L2", payload.cache.l2],
      ];

  return (
    <section className="rounded-3xl border border-cyan-900/70 bg-gray-900/80 p-5 shadow-2xl sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
            Knightly · outil local
          </p>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Diagnostic DEV
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Vue volontairement simple des services déjà instrumentés. Cette
            route répond 404 en production.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-xl border border-cyan-700 bg-cyan-950/40 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-900/50 disabled:opacity-50"
        >
          {loading ? "Vérification…" : "Actualiser"}
        </button>
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-gray-800 bg-gray-950/65 p-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
              {label}
            </p>
            <p className="mt-2 break-words text-lg font-black text-white">
              {value}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-5 text-xs text-gray-500">
        Mesure prise le {new Date(payload.collectedAt).toLocaleString("fr-FR")}.
        Les compteurs repartent à zéro au redémarrage du backend.
      </p>
    </section>
  );
}
