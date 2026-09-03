import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MobilePreviewPage({ searchParams }: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { scenario = "active" } = await searchParams;
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
