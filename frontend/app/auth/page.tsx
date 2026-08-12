import Link from "next/link";
import Image from "next/image";

import AuthForm from "@/app/auth/AuthForm";
import { loginWithGoogle } from "@/app/auth/actions";

export default function AuthPage() {
  const googleIsConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-2xl sm:p-8">
        <Link href="/" className="text-sm text-blue-300 hover:text-blue-200">
          ← Retour à Knightly
        </Link>
        <div className="mt-5 flex items-center gap-3">
          <Image
            src="/brand/knightly-mark.svg"
            alt="Symbole Knightly, cavalier d’échecs"
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
              AI Chess Companion
            </p>
            <p className="text-2xl font-black">Knightly</p>
          </div>
        </div>
        <h1 className="mt-6 text-3xl font-bold">Retrouve ton espace de jeu</h1>
        <div className="mt-4 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4">
          <p className="font-black text-emerald-300">
            30 jours de Knightly+ offerts
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-100/80">
            Toutes les analyses et les fonctions du coach sont débloquées dès
            la création du compte. Aucun paiement n’est demandé pour essayer.
          </p>
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          Crée ton compte pour préparer ton espace personnel et tes prochaines
          sessions d’entraînement.
        </p>

        <div className="mt-6">
          {googleIsConfigured ? (
            <form action={loginWithGoogle}>
              <label className="mb-3 flex items-start gap-3 text-xs leading-5 text-gray-400">
                <input
                  type="checkbox"
                  name="terms"
                  value="accepted"
                  required
                  className="mt-1"
                />
                <span>
                  J’accepte les{" "}
                  <Link className="text-blue-300" href="/legal/terms">
                    conditions
                  </Link>{" "}
                  et la politique de confidentialité.
                </span>
              </label>
              <button
                type="submit"
                className="w-full rounded-xl border border-gray-700 bg-white px-4 py-3 font-semibold text-gray-900 transition hover:bg-gray-100"
              >
                Continuer avec Google
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
              <p className="text-sm font-semibold text-gray-300">
                Connexion Google bientôt disponible
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Configure AUTH_GOOGLE_ID et AUTH_GOOGLE_SECRET pour activer ce
                raccourci.
              </p>
            </div>
          )}
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-gray-600">
          <span className="h-px flex-1 bg-gray-800" />
          ou avec ton adresse e-mail
          <span className="h-px flex-1 bg-gray-800" />
        </div>

        <AuthForm />
      </section>
    </main>
  );
}
