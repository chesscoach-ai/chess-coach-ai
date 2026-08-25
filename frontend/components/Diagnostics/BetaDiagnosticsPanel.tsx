"use client";

import { useEffect, useState } from "react";
import type { BetaDiagnostics } from "@/lib/beta/types";
import { BETA_EVENT_NAMES, KNIGHTLY_BETA_VERSION } from "@/lib/beta/constants";

export default function BetaDiagnosticsPanel() {
  const [data, setData] = useState<BetaDiagnostics | null>(null);
  const [error, setError] = useState("");
  async function load() {
    try { const response = await fetch("/api/dev/beta", { cache: "no-store" }); if (!response.ok) throw new Error(); setData(await response.json()); setError(""); }
    catch { setError("Les indicateurs bêta ne répondent pas."); }
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  return <section className="mt-5 rounded-2xl border border-fuchsia-900/70 bg-fuchsia-950/15 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-fuchsia-300">Bêta privée · {KNIGHTLY_BETA_VERSION}</p><p className="mt-1 text-xs text-gray-400">Événements pseudonymes, avis et bugs. Aucun contenu Nox ni e-mail.</p></div><div className="flex gap-2"><button type="button" onClick={() => { window.localStorage.removeItem("knightly:beta:onboarding:v1"); window.location.assign("/?onboarding=1"); }} className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-bold text-gray-300">Revoir l’onboarding</button><button type="button" onClick={() => void load()} className="rounded-lg border border-fuchsia-800 px-3 py-2 text-xs font-bold text-fuchsia-200">Actualiser</button></div></div>
    {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : !data ? <p className="mt-3 text-sm text-gray-500">Lecture des indicateurs…</p> : <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Stockage" value={data.storage} /><Metric label="Visiteurs" value={data.visitors} /><Metric label="Avis" value={data.feedback} /><Metric label="Bugs signalés" value={data.bugs} />
      {BETA_EVENT_NAMES.filter((name) => name !== "frontend_error").map((name) => <Metric key={name} label={name} value={data.events[name] ?? 0} />)}
      <Metric label="Rétention J1" value={data.retentionJ1 === null ? "à mesurer" : `${data.retentionJ1}%`} /><Metric label="Rétention J7" value={data.retentionJ7 === null ? "à mesurer" : `${data.retentionJ7}%`} /><Metric label="Erreurs frontend" value={data.events.frontend_error ?? 0} />
    </div>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-xl border border-gray-800 bg-gray-950/60 p-3"><p className="break-words text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">{label}</p><p className="mt-1 text-lg font-black text-white">{value}</p></article>; }
