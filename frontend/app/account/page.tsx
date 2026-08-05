import type { Metadata } from "next";
import Link from "next/link";

import DeleteAccountForm from "@/app/account/DeleteAccountForm";
import { auth } from "@/auth";
import { getAnalysisEntitlement } from "@/lib/billing/subscriptionStore";

export const metadata: Metadata = {
  title: "Mes données | Chess Clan",
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
          ← Retour à Chess Clan
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
            {entitlement.status === "lifetime" && (
              <section className="rounded-2xl border border-emerald-800 bg-emerald-950/25 p-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                  Chess Clan Coach+
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">
                  Accès à vie activé
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Toutes les fonctions d’analyse et d’entraînement Coach+ sont
                  débloquées sur ce compte, sans renouvellement ni paiement.
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
