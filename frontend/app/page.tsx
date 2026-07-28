import AccountMenu from "@/components/Auth/AccountMenu";
import ProductWorkspace from "@/components/Layout/ProductWorkspace";
import { auth } from "@/auth";
import { getAnalysisEntitlement } from "@/lib/billing/subscriptionStore";

export default async function Home() {
  const session = await auth();
  const currentUser = session?.user?.email
    ? {
        name: session.user.name ?? session.user.email.split("@")[0],
        email: session.user.email,
      }
    : null;
  const entitlement = await getAnalysisEntitlement(
    currentUser?.email.trim().toLocaleLowerCase("fr") ?? null,
  );

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center">
        <div className="mb-6 flex w-full justify-end">
          <AccountMenu />
        </div>

        <header className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
            Coach d&apos;échecs intelligent
          </p>

          <h1 className="text-4xl font-bold md:text-6xl">
            Chess Coach AI
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-gray-400">
            Joue une position, importe une partie et comprends chacun de tes
            coups grâce à une analyse pédagogique.
          </p>
        </header>

        <ProductWorkspace
          currentUser={currentUser}
          analysisEntitlement={entitlement}
        />
      </div>
    </main>
  );
}
