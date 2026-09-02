import type { Metadata } from "next";
import Link from "next/link";

import DeleteAccountForm from "@/app/account/DeleteAccountForm";
import { auth } from "@/auth";
import { getAnalysisEntitlement } from "@/lib/billing/subscriptionStore";

export const metadata: Metadata = {
  title: "Mes données | Knightly",
};

export default async function AccountPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const entitlement = await getAnalysisEntitlement(email);
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm font-semibold text-blue-300"
        >
          ← Retour à Knightly
        </Link>
        <h1 className="mt-6 text-3xl font-black">
          Mon compte et mes données
        </h1>
        {!email ? (
          <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <p className="text-gray-300">
              Connecte-toi pour accéder aux données du compte.
            </p>
            <Link
              href="/auth"
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-3 font-bold"
            >
              Se connecter
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {entitlement.knightly.plan === "free" && (
              <section className="rounded-2xl border border-indigo-900 bg-indigo-950/20 p-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-300">Knightly Free</p>
                <h2 className="mt-2 text-xl font-bold text-white">L’essentiel pour jouer et progresser</h2>
                <p className="mt-2 text-sm leading-6 text-gray-300">Ta Session du jour, les exercices libres, les rangs de Nox, trois bilans découverte et le Clan restent inclus.</p>
                <Link href="/plus" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-indigo-700 px-4 text-sm font-bold text-indigo-200">Découvrir Knightly+</Link>
              </section>
            )}
            {entitlement.knightly.plan === "plus" && entitlement.status === "active" && (
              <section className="rounded-2xl border border-indigo-700 bg-indigo-950/25 p-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-300">Knightly+</p>
                <h2 className="mt-2 text-xl font-bold text-white">Accompagnement approfondi actif</h2>
                <p className="mt-2 text-sm leading-6 text-gray-300">Nox peut suivre davantage de tendances, de bilans et de sessions personnalisées. Aucun avantage compétitif n’est accordé.</p>
              </section>
            )}
            {entitlement.status === "lifetime" && (
              <section className="rounded-2xl border border-emerald-800 bg-emerald-950/25 p-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                  Knightly+
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">
                  Accès à vie activé
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Toutes les fonctions d’analyse et d’entraînement Knightly+ sont
                  débloquées sur ce compte, sans renouvellement ni paiement.
                </p>
              </section>
            )}
            {entitlement.status === "trialing" && entitlement.trialEndsAt && (
              <section className="rounded-2xl border border-blue-800 bg-blue-950/25 p-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">
                  Essai Knightly+
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">
                  Toutes les fonctions sont débloquées
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Ton mois offert se termine le{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(entitlement.trialEndsAt))}.
                  Aucun paiement ne sera déclenché automatiquement.
                </p>
              </section>
            )}
            <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-xl font-bold">
                Télécharger mes données
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Reçois un fichier JSON avec ton profil, ta progression et
                l’historique de tes parties, sans les identifiants privés de
                tes adversaires.
              </p>
              <a
                href="/api/account/export"
                className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold"
              >
                Télécharger mon export
              </a>
            </section>
            <section className="rounded-2xl border border-red-950 bg-gray-900 p-6">
              <h2 className="text-xl font-bold text-red-200">
                Supprimer mon compte
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                L’abonnement est annulé, les données personnelles sont
                supprimées et les anciennes parties sont anonymisées afin de
                préserver l’historique des adversaires.
              </p>
              <DeleteAccountForm email={email} />
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
