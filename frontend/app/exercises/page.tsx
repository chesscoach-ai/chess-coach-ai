import { auth } from "@/auth";
import AnalysisPaywall from "@/components/Billing/AnalysisPaywall";
import ExerciseLibraryPage from "@/components/Exercises/ExerciseLibraryPage";
import { getAnalysisEntitlement } from "@/lib/billing/subscriptionStore";

export default async function ExercisesPage() {
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

  return entitlement.hasAccess ? (
    <ExerciseLibraryPage />
  ) : (
    <main className="min-h-screen bg-gray-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl">
        <AnalysisPaywall
          currentUser={currentUser}
          entitlement={entitlement}
          feature="exercises"
        />
      </div>
    </main>
  );
}
