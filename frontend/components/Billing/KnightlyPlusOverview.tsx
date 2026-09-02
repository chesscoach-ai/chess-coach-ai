"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { trackBetaEvent } from "@/lib/beta/client";
import type { KnightlyEntitlements } from "@/lib/billing/knightlyPolicy";
import type { KnightlyPricing } from "@/lib/billing/pricing";
import AnalysisPaywall from "@/components/Billing/AnalysisPaywall";
import type { AnalysisEntitlement } from "@/lib/billing/types";

export default function KnightlyPlusOverview({ entitlements, pricing, preview }: { entitlements: KnightlyEntitlements; pricing: KnightlyPricing; preview: string | null }) {
  const tracked = useRef(false);
  useEffect(() => { if (!tracked.current) { tracked.current = true; trackBetaEvent("plus_details_viewed"); } }, []);
  const isPlus = entitlements.plan === "plus";
  if (preview === "soft") {
    const softEntitlement: AnalysisEntitlement = {
      hasAccess: false, status: "inactive", priceMonthlyCents: pricing.activeMonthlyCents ?? pricing.target.monthlyCents,
      priceAnnualCents: pricing.activeAnnualCents ?? pricing.target.annualCents, billingConfigured: false,
      commercialLaunchEnabled: false, canManage: false, currentPeriodEnd: null, trialEndsAt: null,
      cancelAtPeriodEnd: false, knightly: entitlements, pricingAvailability: pricing.availability,
    };
    return <main className="safe-page-bottom min-h-screen bg-gray-950 px-4 py-10 text-white"><div className="mx-auto max-w-4xl"><Link href="/" className="mb-8 inline-flex text-sm font-bold text-indigo-300">← Retour à Knightly</Link><AnalysisPaywall currentUser={null} entitlement={softEntitlement} limitReached /></div></main>;
  }
  const benefits = [
    ["Bilans de parties", "3 bilans découverte", "Davantage d’analyses pédagogiques"],
    ["Session avec Nox", "1 Session du jour", "Jusqu’à 2 approfondissements supplémentaires"],
    ["Mémoire pédagogique", "Tendances essentielles", "Historique et tendances plus profonds"],
    ["Progression", "Rangs et suivi de base", "Statistiques détaillées par thème"],
  ];
  return (
    <main className="safe-page-bottom min-h-screen bg-gray-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-bold text-indigo-300">← Retour à Knightly</Link>
        <div className="mt-8 text-center"><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Knightly+</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">Va plus loin avec Nox.</h1><p className="mx-auto mt-4 max-w-2xl leading-7 text-gray-300">Knightly Free t’apprend déjà à mieux jouer. Plus approfondit la continuité, la personnalisation et la lecture de tes progrès.</p>{preview && <p className="mx-auto mt-4 w-fit rounded-full border border-cyan-800 bg-cyan-950/40 px-3 py-1 text-xs font-bold text-cyan-200">Aperçu DEV · {preview}</p>}<p className="mx-auto mt-3 w-fit rounded-full border border-gray-800 bg-gray-900 px-3 py-1 text-xs font-bold text-gray-300">{isPlus ? "Bilans pédagogiques approfondis" : preview === "quota" ? "0 bilan découverte restant sur 3" : "3 bilans découverte inclus"}</p></div>
        <div className="mt-8 overflow-hidden rounded-3xl border border-gray-800 bg-gray-900">
          <div className="grid grid-cols-[minmax(120px,1fr)_minmax(105px,0.8fr)_minmax(125px,0.9fr)] border-b border-gray-800 bg-gray-950/60 p-3 text-xs font-black sm:p-5 sm:text-sm"><span>Accompagnement</span><span className="text-gray-300">Free</span><span className="text-indigo-300">Knightly+</span></div>
          {benefits.map(([label, free, plus]) => <div key={label} className="grid grid-cols-[minmax(120px,1fr)_minmax(105px,0.8fr)_minmax(125px,0.9fr)] gap-2 border-b border-gray-800 p-3 text-xs last:border-0 sm:p-5 sm:text-sm"><strong>{label}</strong><span className="text-gray-400">{free}</span><span className="text-indigo-200">{plus}</span></div>)}
        </div>
        <section className="mt-6 rounded-2xl border border-indigo-900/70 bg-indigo-950/25 p-5 text-center"><h2 className="text-xl font-black">{isPlus ? "Knightly+ est simulé comme actif" : "Une offre simple, bientôt disponible"}</h2><p className="mt-2 text-sm leading-6 text-gray-300">{pricing.availability === "available" ? "La configuration commerciale est alignée." : "Les prix et le paiement ne sont pas encore activés. Tu peux continuer à utiliser Knightly Free."}</p>{pricing.availability === "available" ? <button type="button" onClick={() => trackBetaEvent("plus_cta_clicked")} className="mt-5 min-h-12 rounded-xl bg-indigo-600 px-6 font-black">Choisir Knightly+</button> : <Link href="/" className="mt-5 inline-flex min-h-12 items-center rounded-xl border border-gray-700 px-6 font-black text-gray-100">Continuer gratuitement</Link>}</section>
        <p className="mt-5 text-center text-xs leading-5 text-gray-500">Aucun avantage en partie classée. OpenAI n’est pas inclus dans l’offre actuelle.</p>
      </div>
    </main>
  );
}
