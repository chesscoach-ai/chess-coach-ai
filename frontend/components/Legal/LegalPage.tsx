import Link from "next/link";
import type { ReactNode } from "react";

import { getLegalIdentity } from "@/lib/commercial/config";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const identity = getLegalIdentity();
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-10 text-gray-200">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-semibold text-blue-300 hover:text-blue-200"
        >
          ← Retour à Knightly
        </Link>
        {!identity.documentsReviewed && (
          <div className="mt-6 rounded-2xl border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-200">
            Document préparatoire : il devra être complété et validé par
            l’éditeur avant l’ouverture des paiements.
          </div>
        )}
        <h1 className="mt-7 text-3xl font-black text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 leading-7 text-gray-400">{intro}</p>
        <div className="legal-copy mt-8 space-y-8">{children}</div>
      </article>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-gray-300">
        {children}
      </div>
    </section>
  );
}
