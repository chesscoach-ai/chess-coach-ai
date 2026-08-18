import { notFound } from "next/navigation";

import DevRuntimeDiagnostics from "@/components/Diagnostics/DevRuntimeDiagnostics";
import { collectDevRuntimeDiagnostics } from "@/lib/diagnostics/devRuntime";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const dynamic = "force-dynamic";

export default async function DevDiagnosticsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl">
        <DevRuntimeDiagnostics
          initialPayload={await collectDevRuntimeDiagnostics(await getAuthenticatedPlayer())}
        />
      </div>
    </main>
  );
}
