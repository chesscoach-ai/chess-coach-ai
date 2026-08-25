"use client";

export type ProductPillar = "play" | "progress" | "clan";

export default function WorkspaceMenu({ pillar, onPlay, onProgress, onClan }: { pillar: ProductPillar; onPlay: () => void; onProgress: () => void; onClan: () => void }) {
  const item = "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 sm:flex-none sm:min-w-36";
  return (
    <nav aria-label="Navigation principale" className="native-sticky-top sticky top-0 z-50 -mx-3 mb-4 hidden border-y border-gray-800/90 bg-gray-950/95 px-3 py-2 shadow-xl backdrop-blur-xl sm:-mx-6 sm:px-6 md:block">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
        <PillarButton active={pillar === "play"} className={item} icon="♞" label="Jouer" onClick={onPlay} tone="blue" />
        <PillarButton active={pillar === "progress"} className={item} icon="◆" label="Progresser" onClick={onProgress} tone="violet" />
        <PillarButton active={pillar === "clan"} className={item} icon="⚔" label="Clan" onClick={onClan} tone="red" />
      </div>
    </nav>
  );
}

function PillarButton({ active, className, icon, label, onClick, tone }: { active: boolean; className: string; icon: string; label: string; onClick: () => void; tone: "blue" | "violet" | "red" }) {
  const activeTone = { blue: "bg-blue-600 text-white", violet: "bg-violet-700 text-white", red: "bg-red-800 text-white" }[tone];
  return <button type="button" aria-current={active ? "page" : undefined} onClick={onClick} className={`${className} ${active ? activeTone : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}><span aria-hidden="true">{icon}</span>{label}</button>;
}
