"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { trackBetaEvent } from "@/lib/beta/client";

const STORAGE_KEY = "knightly:beta:onboarding:v1";
const steps = [
  ["Bienvenue dans Knightly", "Joue aux échecs avec Nox à tes côtés."],
  ["Nox t’explique tes coups", "Il te montre ce que tu as bien vu et ce que tu peux améliorer."],
  ["Il apprend à te connaître", "Tes difficultés deviennent de courtes missions personnalisées."],
  ["Vous progressez ensemble", "Quand tu progresses, Nox évolue lui aussi."],
] as const;

export default function BetaOnboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const forcedInDev = process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("onboarding") === "1";
    const timer = window.setTimeout(() => setVisible(forcedInDev || !window.localStorage.getItem(STORAGE_KEY)), 250);
    return () => window.clearTimeout(timer);
  }, []);

  function finish() {
    window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    trackBetaEvent("onboarding_completed");
    setVisible(false);
  }
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="beta-onboarding-title">
      <section className="w-full max-w-md rounded-3xl border border-indigo-700/70 bg-gray-950 p-5 shadow-2xl sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border border-indigo-700 bg-indigo-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-200">Beta · {step + 1}/4</span>
          <button type="button" onClick={finish} className="min-h-11 px-2 text-sm font-bold text-gray-400 hover:text-white">Passer</button>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <Image src="/brand/nox-squire.svg" alt="Nox, ton compagnon d’échecs" width={72} height={72} className="h-16 w-16 rounded-2xl border border-indigo-700 bg-indigo-950" />
          <div><p className="text-xs font-black uppercase tracking-[0.15em] text-indigo-300">Nox à tes côtés</p><h2 id="beta-onboarding-title" className="mt-1 text-2xl font-black text-white">{steps[step][0]}</h2></div>
        </div>
        <p className="mt-5 min-h-14 text-base leading-7 text-gray-300">{steps[step][1]}</p>
        {step === 2 && <p className="rounded-xl border border-gray-800 bg-gray-900/70 p-3 text-xs leading-5 text-gray-400">Tu peux jouer sans compte. Connecte-toi plus tard pour que Nox se souvienne de ce que vous apprenez ensemble.</p>}
        <div className="mt-6 flex gap-2" aria-label="Progression de l’introduction">{steps.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-indigo-500" : "bg-gray-800"}`} />)}</div>
        <button type="button" autoFocus onClick={() => step < steps.length - 1 ? setStep(step + 1) : finish()} className="mt-5 min-h-12 w-full rounded-xl bg-indigo-600 px-5 font-black text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">
          {step === steps.length - 1 ? "Commencer à jouer" : "Continuer"}
        </button>
      </section>
    </div>
  );
}
