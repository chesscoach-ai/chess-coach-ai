"use client";

type MenuItem =
  | { label: string; targetId: string; href?: never; primary?: boolean }
  | { label: string; href: string; targetId?: never; primary?: boolean };

const ITEMS: MenuItem[] = [
  { label: "Échiquier", targetId: "game-board", primary: true },
  { label: "Coach IA", targetId: "coach-analysis" },
  { label: "Statistiques", targetId: "statistics" },
  { label: "Historique", targetId: "game-history" },
  { label: "Bilan du coach", targetId: "coach-summary" },
  { label: "Importer une partie", targetId: "pgn-import" },
  { label: "Exercices", href: "/exercises" },
];

export default function WorkspaceMenu() {
  function scrollToSection(targetId: string): void {
    const target =
      document.getElementById(targetId);
    if (
      target instanceof
      HTMLDetailsElement
    ) {
      target.open = true;
    }
    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <nav aria-label="Navigation de l’espace de travail" className="sticky top-0 z-40 -mx-2 hidden overflow-x-auto border-b border-gray-800/80 bg-gray-950/90 px-2 py-3 shadow-lg backdrop-blur-xl md:block">
      <div className="flex min-w-max items-center gap-2">
        {ITEMS.map((item) => {
          const classes = item.primary
            ? "rounded-xl border border-blue-500 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
            : "rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-blue-700 hover:bg-blue-950/30 hover:text-white";

          return "href" in item ? (
            <a key={item.label} href={item.href} className={classes}>{item.label}</a>
          ) : (
            <button key={item.label} type="button" onClick={() => scrollToSection(item.targetId)} className={classes}>{item.label}</button>
          );
        })}
      </div>
    </nav>
  );
}
