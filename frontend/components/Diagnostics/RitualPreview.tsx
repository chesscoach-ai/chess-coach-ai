"use client";

import { useState } from "react";
import { PlayLauncher } from "@/components/Multiplayer/MultiplayerWorkspace";

/** Uses the real launcher, but never mounts authenticated workspaces. */
export default function RitualPreview() {
  const [notice, setNotice] = useState("");
  const simulate = () => setNotice("Navigation simulée : aucune partie ni donnée de compte n’est modifiée.");
  return <main className="safe-page-bottom min-h-screen bg-gray-950 px-3 py-3 text-white sm:p-6">
    <header className="mx-auto mb-3 max-w-7xl"><p className="text-lg font-black">Knightly <span className="text-xs text-indigo-300">DEV · Rituel</span></p><p className="text-xs text-gray-400">Données fictives. Actions simulées.</p></header>
    <PlayLauncher currentUser={null} onSelect={simulate} onAnalyze={simulate} onHistory={simulate} onOpenProgress={simulate} />
    {notice && <p role="status" className="mx-auto mt-3 max-w-7xl text-sm text-amber-200">{notice}</p>}
    <nav aria-label="Navigation mobile simulée" className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-gray-700 bg-gray-950 p-2 sm:hidden">{["Jouer", "Nox", "Exercices", "Progrès"].map(label => <button type="button" key={label} onClick={simulate} className="min-h-11 px-2 text-xs font-bold text-indigo-200">{label}</button>)}</nav>
  </main>;
}
