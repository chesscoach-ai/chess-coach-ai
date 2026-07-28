"use client";

import {
  type ReactNode,
  useState,
} from "react";

type ReportTab =
  | "summary"
  | "timeline"
  | "phases";

type GameReportTabsProps = {
  summary: ReactNode;
  timeline: ReactNode;
  phases: ReactNode;
  analyzedMoves: number;
  totalMoves: number;
};

const TABS: Array<{
  id: ReportTab;
  label: string;
  description: string;
}> = [
  {
    id: "summary",
    label: "Vue d’ensemble",
    description:
      "Précision, erreurs et moments critiques.",
  },
  {
    id: "timeline",
    label: "Évolution",
    description:
      "Visualise les bascules d’évaluation.",
  },
  {
    id: "phases",
    label: "Phases de jeu",
    description:
      "Compare ouverture, milieu et finale.",
  },
];

export default function GameReportTabs({
  summary,
  timeline,
  phases,
  analyzedMoves,
  totalMoves,
}: GameReportTabsProps) {
  const [activeTab, setActiveTab] =
    useState<ReportTab>("summary");

  const progress =
    totalMoves > 0
      ? Math.min(
          100,
          (analyzedMoves / totalMoves) *
            100,
        )
      : 0;

  const activeTabData =
    TABS.find(
      (tab) => tab.id === activeTab,
    ) ?? TABS[0];

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-900 shadow-xl">
      <div className="border-b border-gray-800 px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Rapport de partie
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Comprendre ta performance
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              Passe d’une synthèse rapide à une
              lecture détaillée des moments qui ont
              changé la partie.
            </p>
          </div>

          <div className="min-w-[190px] rounded-2xl border border-gray-800 bg-gray-950/55 px-4 py-3">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-gray-500">
                Coups analysés
              </span>

              <span className="font-mono font-semibold text-gray-200">
                {analyzedMoves} / {totalMoves}
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div
          className="mt-5 grid gap-2 sm:grid-cols-3"
          role="tablist"
          aria-label="Sections du rapport de partie"
        >
          {TABS.map((tab) => {
            const active =
              tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setActiveTab(tab.id);
                }}
                className={[
                  "rounded-xl border px-4 py-3 text-left transition",
                  active
                    ? "border-blue-600/70 bg-blue-950/35 text-white"
                    : "border-gray-800 bg-gray-950/35 text-gray-400 hover:border-gray-700 hover:text-gray-200",
                ].join(" ")}
              >
                <span className="block text-sm font-semibold">
                  {tab.label}
                </span>

                <span className="mt-1 hidden text-xs leading-5 text-gray-500 lg:block">
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-200">
            {activeTabData.label}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {activeTabData.description}
          </p>
        </div>

        <div
          role="tabpanel"
          aria-label={activeTabData.label}
        >
          {activeTab === "summary" &&
            summary}

          {activeTab === "timeline" &&
            timeline}

          {activeTab === "phases" &&
            phases}
        </div>
      </div>
    </section>
  );
}