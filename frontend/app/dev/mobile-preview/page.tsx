import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MobilePreviewPage({ searchParams }: {
  searchParams: Promise<{ feature?: string; scenario?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { feature, scenario = feature === "ritual" ? "return_1_day" : "active" } = await searchParams;
  const ritualAllowed = ["first_visit", "same_day", "return_1_day", "return_3_days", "return_14_days", "active_game", "active_session", "recent_improvement", "near_evolution", "no_context"];
  if (feature === "ritual") {
    const ritualScenario = ritualAllowed.includes(scenario) ? scenario : "return_1_day";
    return <main className="min-h-screen bg-black p-6 text-white"><p className="mb-3 text-xs font-bold text-gray-400">Aperçu DEV · Rituel Knightly · viewport 390 × 844</p><iframe title={`Aperçu mobile Rituel ${ritualScenario}`} src={`/?mode=multiplayer&ritualPreview=${ritualScenario}`} className="block h-[844px] w-[390px] border-0 bg-gray-950" /></main>;
  }
  const allowed = ["empty", "duo", "active", "activity", "invite", "challenge", "goal"];
  const selected = allowed.includes(scenario) ? scenario : "active";
  const invite = selected === "invite" ? "&clanInvite=KLY-DEMO2026" : "";

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <p className="mb-3 text-xs font-bold text-gray-400">Aperçu DEV · viewport Knightly 390 × 844</p>
      <iframe
        title={`Aperçu mobile Clan ${selected}`}
        src={`/?mode=multiplayer&kind=community&clanPreview=${selected}${invite}`}
        className="block h-[844px] w-[390px] border-0 bg-gray-950"
      />
    </main>
  );
}
