"use client";

import { useState } from "react";

import AnalysisPanel from "@/components/Analysis/AnalysisPanel";
import PGNInput from "@/components/PGN/PGNInput";

type WorkspaceToolsProps = {
  fen: string;
  onAnalysisComplete: (
    analysis: unknown,
  ) => void;
  onImport: (pgn: string) => void;
  onReset: () => void;
};

type ToolTab = "analysis" | "pgn";

export default function WorkspaceTools({
  fen,
  onAnalysisComplete,
  onImport,
  onReset,
}: WorkspaceToolsProps) {
  const [activeTab, setActiveTab] =
    useState<ToolTab>("analysis");

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 px-4 py-3 sm:px-5">
        <div>
          <p className="text-sm font-semibold text-white">
            Outils
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Analyse une position ou importe une
            partie.
          </p>
        </div>

        <div
          className="inline-flex rounded-xl border border-gray-700 bg-gray-950 p-1"
          role="tablist"
          aria-label="Outils de la partie"
        >
          <TabButton
            active={
              activeTab === "analysis"
            }
            label="Analyse"
            onClick={() => {
              setActiveTab("analysis");
            }}
          />

          <TabButton
            active={activeTab === "pgn"}
            label="Importer PGN"
            onClick={() => {
              setActiveTab("pgn");
            }}
          />
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {activeTab === "analysis" ? (
          <div
            role="tabpanel"
            aria-label="Analyse de position"
          >
            <AnalysisPanel
              fen={fen}
              onAnalysisComplete={
                onAnalysisComplete
              }
            />
          </div>
        ) : (
          <div
            role="tabpanel"
            aria-label="Import PGN"
          >
            <PGNInput
              onImport={onImport}
              onReset={onReset}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "rounded-lg px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-gray-800 text-white shadow-sm"
          : "text-gray-400 hover:text-gray-200",
      ].join(" ")}
    >
      {label}
    </button>
  );
}