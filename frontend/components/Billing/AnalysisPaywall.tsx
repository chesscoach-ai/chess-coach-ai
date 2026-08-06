"use client";

import Link from "next/link";
import { useState } from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import type { AnalysisEntitlement } from "@/lib/billing/types";
import { isNativeApp } from "@/lib/mobile/platform";

export default function AnalysisPaywall({
  currentUser,
  entitlement,
}: {
  currentUser: CurrentUser | null;
  entitlement: AnalysisEntitlement;
}) {
  const nativeApp = isNativeApp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const currency = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
  const formattedPrice = currency.format(
    (plan === "annual"
      ? entitlement.priceAnnualCents
      : entitlement.priceMonthlyCents) / 100,
  );
  const annualMonthlyEquivalent = currency.format(
    entitlement.priceAnnualCents / 1_200,
  );
  const annualSaving = Math.max(
    0,
    Math.round(
      (1 -
        entitlement.priceAnnualCents /
          (entitlement.priceMonthlyCents * 12)) *
        100,
    ),
  );

  async function redirectToBilling(endpoint: "checkout" | "portal") {
    if (nativeApp) {
      setError(
        "Les achats intégrés seront activés après la création des comptes Apple et Google. Aucun paiement web n’est lancé depuis l’application.",
      );
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/billing/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          endpoint === "checkout"
            ? JSON.stringify({ plan })
            : undefined,
      });
      const payload = (await response.json()) as {
        url?: string;
        message?: string;
      };
      if (!response.ok || !payload.url) {
        throw new Error(
          payload.message ?? "Le paiement ne peut pas être ouvert.",
        );
      }
      window.location.assign(payload.url);
    } catch (billingError) {
      setError(
        billingError instanceof Error
          ? billingError.message
          : "Le paiement ne peut pas être ouvert.",
      );
      setIsLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-blue-800/70 bg-gray-900 shadow-2xl">
      <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] md:p-9">
        <div>
          <span className="inline-flex rounded-full border border-blue-700 bg-blue-950/50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-300">
            Chess Clan Coach+
          </span>
          <h2 className="mt-5 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
            Le coach qui transforme tes parties en progrès
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">
            Comprends les moments décisifs, rejoue tes erreurs et reçois un
            programme adapté à ton Elo et à tes difficultés récurrentes.
          </p>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {[
              "Analyse complète et explications sans jargon",
              "Faiblesses suivies d’une partie à l’autre",
              "Moments critiques et meilleurs coups expliqués",
              "Exercices créés depuis tes propres erreurs",
              "Conseils adaptés à ton niveau Elo",
              "Aucune aide activée pendant les parties classées",
            ].map((benefit) => (
              <li
                key={benefit}
                className="flex gap-3 rounded-xl border border-gray-800 bg-gray-950/45 p-3 text-sm leading-6 text-gray-300"
              >
                <span className="font-black text-emerald-400">✓</span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="self-center rounded-2xl border border-blue-700 bg-blue-950/30 p-6">
          <p className="text-sm font-semibold text-blue-300">Choisis ton rythme</p>
          <div
            role="radiogroup"
            aria-label="Formule Coach+"
            className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-950/60 p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={plan === "annual"}
              onClick={() => setPlan("annual")}
              className={[
                "rounded-lg px-3 py-2 text-xs font-bold transition",
                plan === "annual"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white",
              ].join(" ")}
            >
              Annuel · -{annualSaving} %
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={plan === "monthly"}
              onClick={() => setPlan("monthly")}
              className={[
                "rounded-lg px-3 py-2 text-xs font-bold transition",
                plan === "monthly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white",
              ].join(" ")}
            >
              Mensuel
            </button>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-5xl font-black text-white">
              {formattedPrice}
            </span>
            <span className="pb-1 text-gray-400">
              / {plan === "annual" ? "an" : "mois"}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            {plan === "annual"
              ? `Soit ${annualMonthlyEquivalent} par mois.`
              : "Sans engagement annuel."}{" "}
            Annulable depuis le portail sécurisé Stripe.
          </p>

          {!currentUser ? (
            <Link
              href="/auth"
              className="mt-6 flex w-full justify-center rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-500"
            >
              Créer mon compte — 30 jours offerts
            </Link>
          ) : (
            <button
              type="button"
              disabled={
                isLoading ||
                !entitlement.billingConfigured ||
                nativeApp
              }
              onClick={() =>
                void redirectToBilling(
                  entitlement.canManage ? "portal" : "checkout",
                )
              }
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isLoading
                ? "Ouverture…"
                : entitlement.canManage
                  ? "Gérer mon abonnement"
                  : `Choisir Coach+ ${plan === "annual" ? "annuel" : "mensuel"}`}
            </button>
          )}

          {currentUser && !entitlement.billingConfigured && (
            <p className="mt-3 text-xs leading-5 text-amber-300">
              {entitlement.commercialLaunchEnabled
                ? "Le paiement est en cours de validation avant son ouverture."
                : "Les abonnements ne sont pas encore ouverts. Aucun paiement ne peut être déclenché."}
            </p>
          )}
          {currentUser && nativeApp && (
            <p className="mt-3 text-xs leading-5 text-blue-300">
              Les achats intégrés Apple et Google sont préparés mais restent
              volontairement désactivés jusqu’à la création des comptes
              développeur. Ton accès existant reste synchronisé.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {error}
            </p>
          )}
          <p className="mt-4 text-center text-xs text-gray-500">
            Multijoueur gratuit · aucun avantage compétitif payant
          </p>
        </div>
      </div>
    </section>
  );
}
