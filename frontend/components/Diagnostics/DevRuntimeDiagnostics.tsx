"use client";

import { useEffect, useState } from "react";

import type { DevRuntimeDiagnosticPayload } from "@/types/devRuntimeDiagnostics";
import {
  readFrontendAnalysisDiagnostic,
  type FrontendAnalysisDiagnostic,
} from "@/services/api/analysisDiagnostics";

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
  const [frontendAnalysis, setFrontendAnalysis] =
    useState<FrontendAnalysisDiagnostic | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFrontendAnalysis(readFrontendAnalysisDiagnostic());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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
      setFrontendAnalysis(readFrontendAnalysisDiagnostic());
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
  const l2Reads = numberValue(payload.metrics, "l2_cache_reads");
  const l2ReadDuration = numberValue(
    payload.metrics,
    "l2_read_duration_ms",
  );
  const noxMetrics =
    payload.noxAi?.metrics &&
    typeof payload.noxAi.metrics === "object"
      ? (payload.noxAi.metrics as Record<string, unknown>)
      : null;
  const noxCache =
    payload.noxAi?.cache && typeof payload.noxAi.cache === "object"
      ? (payload.noxAi.cache as Record<string, unknown>)
      : null;
  const noxRecentErrors = Array.isArray(noxMetrics?.recent_errors)
    ? noxMetrics.recent_errors.join(", ") || "aucune"
    : "aucune";

  const cards = [
        ["API frontend", payload.frontend.status],
        ["Backend", payload.backend.status],
        ["Stockfish", textValue(payload.stockfish, "engine")],
        ["Moteurs", textValue(payload.stockfish, "pool_size")],
        ["Actifs", textValue(payload.metrics, "engines_busy", "0")],
        ["Disponibles", textValue(payload.metrics, "engines_idle", "0")],
        ["File actuelle", textValue(payload.metrics, "queue_size", "0")],
        ["Analyses totales", String(analyses)],
        ["L1 cache hits", textValue(payload.metrics, "l1_cache_hits", "0")],
        ["L2 cache hits", textValue(payload.metrics, "l2_cache_hits", "0")],
        ["Cache misses", textValue(payload.metrics, "cache_misses", "0")],
        ["Entrées L2", textValue(payload.cache, "entries", "0")],
        ["Backend L2", textValue(payload.cache, "backend", "aucun")],
        [
          "Lecture L2 moyenne",
          `${(l2Reads > 0 ? l2ReadDuration / l2Reads : 0).toFixed(1)} ms`,
        ],
        [
          "Erreurs L2",
          String(
            numberValue(payload.metrics, "l2_read_failures") +
              numberValue(payload.metrics, "l2_write_failures"),
          ),
        ],
        [
          "Payloads invalides",
          textValue(payload.metrics, "l2_invalid_payloads", "0"),
        ],
        [
          "Évictions L2",
          textValue(payload.metrics, "l2_cache_evictions", "0"),
        ],
        ["Temps moyen", `${averageDuration.toFixed(0)} ms`],
        ["Timeouts", textValue(payload.metrics, "timeouts", "0")],
        ["Crashes", textValue(payload.metrics, "engine_crashes", "0")],
        ["Restarts", textValue(payload.metrics, "restarts", "0")],
        ["Base", `${payload.database.type} · ${payload.database.status}`],
        [
          "DATABASE_URL",
          payload.database.urlDetected ? "détectée" : "non requise en local",
        ],
        ["Migrations", payload.database.migrationStatus],
        [
          "Version schéma",
          payload.database.currentVersion ?? "mode local",
        ],
        ["Révision attendue", payload.database.headVersion ?? "—"],
        [
          "Table cache PG",
          payload.database.cacheTablePresent === null
            ? "non applicable"
            : payload.database.cacheTablePresent
              ? "présente"
              : "absente",
        ],
        ["Dernier endpoint", frontendAnalysis?.endpoint ?? "—"],
        ["État frontend", frontendAnalysis?.state ?? "idle"],
        [
          "Durée frontend",
          frontendAnalysis?.durationMs === null || !frontendAnalysis
            ? "—"
            : `${frontendAnalysis.durationMs} ms`,
        ],
        [
          "Code HTTP frontend",
          frontendAnalysis?.httpStatus === null || !frontendAnalysis
            ? "—"
            : String(frontendAnalysis.httpStatus),
        ],
        ["Erreurs frontend", String(frontendAnalysis?.recentErrors ?? 0)],
        ["Requêtes frontend", String(frontendAnalysis?.totalRequests ?? 0)],
        [
          "Requêtes annulées",
          String(frontendAnalysis?.cancelledRequests ?? 0),
        ],
        [
          "Appels évités (debounce)",
          String(frontendAnalysis?.debounceAvoided ?? 0),
        ],
        [
          "Nox AI activée",
          payload.noxAi?.ai_enabled === true ? "oui" : "non",
        ],
        [
          "OpenAI configuré",
          payload.noxAi?.openai_configured === true ? "oui" : "non",
        ],
        ["Provider Nox", textValue(payload.noxAi, "active_provider")],
        ["Modèle Nox", textValue(payload.noxAi, "model")],
        ["Prompt Nox", textValue(payload.noxAi, "prompt_version")],
        ["Appels Nox", textValue(noxMetrics, "requests_total", "0")],
        ["Appels IA", textValue(noxMetrics, "ai_requests", "0")],
        ["Succès IA", textValue(noxMetrics, "ai_success", "0")],
        ["Fallbacks Nox", textValue(noxMetrics, "fallbacks", "0")],
        ["Cache hits Nox", textValue(noxMetrics, "cache_hits", "0")],
        ["Cache Nox", textValue(noxCache, "backend", "aucun")],
        ["Tokens entrée", textValue(noxMetrics, "input_tokens", "0")],
        ["Tokens sortie", textValue(noxMetrics, "output_tokens", "0")],
        [
          "Latence Nox moyenne",
          `${numberValue(noxMetrics, "average_latency_ms").toFixed(0)} ms`,
        ],
        [
          "Coût Nox estimé",
          `${numberValue(noxMetrics, "estimated_cost").toFixed(6)}`,
        ],
        [
          "Validations rejetées",
          textValue(noxMetrics, "validation_failures", "0"),
        ],
        ["Erreurs Nox récentes", noxRecentErrors],
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
