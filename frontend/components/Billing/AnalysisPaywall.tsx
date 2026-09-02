"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import { trackBetaEvent } from "@/lib/beta/client";
import type { AnalysisEntitlement } from "@/lib/billing/types";

export default function AnalysisPaywall({ currentUser, entitlement, feature = "analysis", onContinueFree, limitReached = false }: { currentUser: CurrentUser | null; entitlement: AnalysisEntitlement; feature?: "analysis" | "exercises"; onContinueFree?: () => void; limitReached?: boolean }) {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackBetaEvent("plus_offer_viewed");
    if (limitReached) trackBetaEvent("plus_limit_reached");
  }, [limitReached]);

  const dismiss = () => {
    trackBetaEvent("plus_dismissed");
    onContinueFree?.();
  };

  return (
    <section aria-labelledby="knightly-plus-offer-title" className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-indigo-800/70 bg-gradient-to-br from-gray-900 via-indigo-950/35 to-gray-900 shadow-2xl">
      <div className="p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-300">Knightly+</p><h2 id="knightly-plus-offer-title" className="mt-2 text-2xl font-black text-white sm:text-3xl">{limitReached ? "Nox a terminé les bilans découverte inclus." : "Nox peut aller plus loin."}</h2></div>
          {onContinueFree && <button type="button" aria-label="Fermer la présentation Knightly+" onClick={dismiss} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-700 text-xl text-gray-300 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">×</button>}
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">{feature === "exercises" ? "Les exercices libres restent accessibles. Knightly+ ajoutera surtout davantage de sessions personnalisées et un suivi plus profond avec Nox." : "Tu peux continuer à jouer, retrouver ta Session du jour et faire progresser Nox gratuitement. Knightly+ approfondit les analyses et le suivi de tes thèmes."}</p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {["Plus de bilans pédagogiques", "Historique Nox plus profond", "Sessions personnalisées supplémentaires", "Statistiques détaillées par thème"].map((benefit) => <li key={benefit} className="flex gap-2 rounded-xl border border-white/5 bg-black/20 p-3 text-sm text-gray-200"><span aria-hidden="true" className="text-indigo-300">✦</span>{benefit}</li>)}
        </ul>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/plus" onClick={() => trackBetaEvent("plus_cta_clicked")} className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-indigo-600 px-5 font-black text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">Découvrir Knightly+</Link>
          {onContinueFree ? <button type="button" onClick={dismiss} className="min-h-12 flex-1 rounded-xl border border-gray-700 px-5 font-bold text-gray-200 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">Continuer gratuitement</button> : <Link href="/" className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-gray-700 px-5 font-bold text-gray-200 hover:bg-gray-800">Continuer gratuitement</Link>}
        </div>
        <p className="mt-4 text-xs leading-5 text-gray-500">{entitlement.pricingAvailability === "available" ? "L’offre commerciale est disponible depuis ton compte." : "Offre en préparation : aucun paiement ne peut être déclenché actuellement."}{!currentUser && " Découvre d’abord Knightly librement, sans créer de compte."}</p>
        <p className="mt-2 text-xs font-semibold text-emerald-300">Multijoueur, Elo, Clan et rangs de Nox restent gratuits. Aucun avantage compétitif n’est vendu.</p>
      </div>
    </section>
  );
}
