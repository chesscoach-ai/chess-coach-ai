import { auth } from "@/auth";
import AnalysisPaywall from "@/components/Billing/AnalysisPaywall";
import ExerciseTrainer from "@/components/Exercises/ExerciseTrainer";
import { getAnalysisEntitlement } from "@/lib/billing/subscriptionStore";
import { cookies } from "next/headers";

export default async function ExerciseTrainingPage({ searchParams }: { searchParams: Promise<{ mission?: string }> }) {
  const missionMode = (await searchParams).mission === "1" && Boolean((await cookies()).get("knightly_mission_access")?.value);
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

  return entitlement.hasAccess || missionMode ? (
    <ExerciseTrainer />
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
