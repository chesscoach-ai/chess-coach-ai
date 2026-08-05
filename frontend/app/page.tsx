import Image from "next/image";

import AccountMenu from "@/components/Auth/AccountMenu";
import ProductWorkspace from "@/components/Layout/ProductWorkspace";
import ExperienceSettings from "@/components/Settings/ExperienceSettings";
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
    <main className="safe-page-bottom min-h-screen bg-gray-950 px-3 pt-3 text-white sm:px-6 sm:pt-6 lg:pt-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center">
        <header className="mb-4 flex w-full items-center justify-between gap-4 border-b border-gray-800/80 pb-3 sm:mb-6 sm:pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/brand/chess-clan-mark-64.png"
              alt="Emblème Chess Clan"
              width={64}
              height={64}
              priority
              className="h-12 w-12 shrink-0 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.28)] sm:h-16 sm:w-16"
            />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-400 sm:text-xs sm:tracking-[0.22em]">
                Deviens le roi des échecs !
              </p>
              <h1 className="truncate text-xl font-black text-white sm:mt-1 sm:text-3xl">
                Chess Clan
              </h1>
              <p className="mt-1 hidden text-sm text-gray-400 md:block">
                Ton clan pour jouer. Ton mentor pour progresser.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ExperienceSettings
              isAuthenticated={Boolean(
                currentUser,
              )}
            />
            <AccountMenu />
          </div>
        </header>

        <ProductWorkspace
          currentUser={currentUser}
          analysisEntitlement={entitlement}
        />
      </div>
    </main>
  );
}
