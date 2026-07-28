"use client";

import {
  AI_LEVELS,
  AI_PERSONAS,
  getAiLevel,
  getAiPersona,
  type AiLevelId,
  type AiPersonaId,
  type PreferredColor,
} from "@/lib/ai/opponents";
import type { AiOpponentController } from "@/hooks/useAiOpponent";

export default function AiOpponentPanel({
  opponent,
  context,
}: {
  opponent: AiOpponentController;
  context: "analysis" | "competitive";
}) {
  const level = getAiLevel(opponent.levelId);
  const persona = getAiPersona(opponent.personaId);

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-3 shadow-lg sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-xl text-blue-200"
          >
            ♞
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-400">
              Adversaire IA
            </p>
            <p className="truncate text-sm font-bold text-white">
              {opponent.enabled
                ? `${persona.name} · ${level.estimatedElo} Elo`
                : "Configurer un duel d’entraînement"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <CompactSelect
            ariaLabel="Niveau de l’adversaire"
            value={opponent.levelId}
            onChange={(value) =>
              opponent.setLevelId(
                value as AiLevelId,
              )
            }
            options={AI_LEVELS.map(
              (item) => ({
                value: item.id,
                label: `${item.label} · ${item.estimatedElo}`,
              }),
            )}
          />
          <CompactSelect
            ariaLabel="Style de jeu"
            value={opponent.personaId}
            onChange={(value) =>
              opponent.setPersonaId(
                value as AiPersonaId,
              )
            }
            options={AI_PERSONAS.map(
              (item) => ({
                value: item.id,
                label: item.name,
              }),
            )}
          />
          <CompactSelect
            ariaLabel="Couleur du joueur"
            value={opponent.preferredColor}
            onChange={(value) =>
              opponent.setPreferredColor(
                value as PreferredColor,
              )
            }
            options={[
              {
                value: "white",
                label: "Blancs",
              },
              {
                value: "black",
                label: "Noirs",
              },
              {
                value: "random",
                label: "Aléatoire",
              },
            ]}
          />
          <button
            type="button"
            onClick={opponent.startNewGame}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-500"
          >
            {opponent.enabled
              ? "Rejouer"
              : "Jouer"}
          </button>
          {opponent.enabled && (
            <button
              type="button"
              onClick={opponent.stop}
              className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-gray-800"
            >
              Quitter
            </button>
          )}
        </div>
      </div>

      {(opponent.enabled ||
        opponent.error) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 pt-2 text-xs text-gray-400">
          <p>
            {opponent.error ??
              `${persona.subtitle} · Tu joues les ${
                opponent.playerColor ===
                "white"
                  ? "Blancs"
                  : "Noirs"
              }. ${
                opponent.isThinking
                  ? "L’adversaire réfléchit…"
                  : context === "analysis"
                    ? "Aides pédagogiques actives."
                    : "Aucune assistance visible."
              }`}
          </p>
          {opponent.error && (
            <button
              type="button"
              onClick={opponent.retry}
              className="font-bold text-amber-300"
            >
              Réessayer
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function CompactSelect({
  ariaLabel,
  value,
  onChange,
  options,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      className="max-w-40 rounded-lg border border-gray-700 bg-gray-950 px-2.5 py-2 text-xs font-semibold text-gray-200 outline-none focus:border-blue-500"
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
