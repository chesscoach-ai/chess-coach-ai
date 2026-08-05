import type { Metadata } from "next";
import Link from "next/link";

import DeleteAccountForm from "@/app/account/DeleteAccountForm";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Mes données | Chess Clan",
};

export default async function AccountPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
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
