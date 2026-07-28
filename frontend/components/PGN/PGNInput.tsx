"use client";

import { useState } from "react";

type PGNInputProps = {
  onImport: (pgn: string) => void;
  onReset: () => void;
};

export default function PGNInput({ onImport, onReset }: PGNInputProps) {
  const [pgn, setPgn] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleImport(): void {
    const normalized = pgn.trim();

    if (!normalized) {
      setError("Colle un PGN avant de lancer l’import.");
      return;
    }

    try {
      onImport(normalized);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Le PGN n’a pas pu être importé.",
      );
    }
  }

  function handleReset(): void {
    setPgn("");
    setError(null);
    onReset();
  }

  return (
    <section id="pgn-import" className="scroll-mt-24 rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">Importer une partie</p>
        <h2 className="mt-2 text-xl font-bold text-white">Importer mon PGN</h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">Colle une partie exportée depuis Chess.com, Lichess ou une autre plateforme.</p>
      </div>

      <textarea
        value={pgn}
        onChange={(event) => {
          setPgn(event.target.value);
          setError(null);
        }}
        rows={9}
        placeholder={`[Event "Ma partie"]
[White "Joueur blanc"]
[Black "Joueur noir"]

1. e4 e5 2. Nf3 Nc6 ...`}
        spellCheck={false}
        className="mt-4 w-full resize-y rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 font-mono text-sm leading-6 text-gray-200 outline-none transition placeholder:text-gray-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
      />

      {error && <p className="mt-3 rounded-xl border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={handleImport} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">Importer le PGN</button>
        <button type="button" onClick={handleReset} className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-gray-800">Réinitialiser</button>
      </div>
    </section>
  );
}
