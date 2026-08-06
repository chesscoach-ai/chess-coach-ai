"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";

const TIME_CONTROLS = [
  {
    minutes: 1,
    label: "Bullet",
    duration: "1 min",
    description: "Décisions éclair",
  },
  {
    minutes: 5,
    label: "Blitz",
    duration: "5 min",
    description: "Rapide et tactique",
  },
  {
    minutes: 10,
    label: "Rapide",
    duration: "10 min",
    description: "Idéal pour progresser",
  },
] as const;

const EXTRA_TIME_CONTROLS = [
  { minutes: 3, label: "Blitz 3 min" },
  { minutes: 15, label: "Rapide 15 min" },
] as const;

export default function OnlineLobby({
  currentUser,
  view = "matchmaking",
  isLoading,
  error,
  onCreate,
  onJoin,
  onFindMatch,
}: {
  currentUser: CurrentUser | null;
  view?: "matchmaking" | "friend";
  isLoading: boolean;
  error: string;
  onCreate: (minutes: number) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
  onFindMatch: (minutes: number) => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const [minutes, setMinutes] = useState(10);
  const [inviteCode, setInviteCode] = useState(() =>
    (searchParams.get("invite") ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8),
  );

  if (!currentUser) {
    return (
      <section className="rounded-2xl border border-blue-900/60 bg-blue-950/20 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">
          Jeu en ligne
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          Connecte-toi pour entrer dans l’arène
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400">
          Le compte permet de retrouver ta partie, protéger tes coups et faire
          évoluer ton classement Elo après chaque résultat.
        </p>
        <Link
          href="/auth"
          className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
        >
          Se connecter ou créer un compte
        </Link>
      </section>
    );
  }

  function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inviteCode.length >= 6) {
      void onJoin(inviteCode);
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      {view === "friend" && (
        <div className="rounded-2xl border border-blue-900/60 bg-blue-950/20 p-4 lg:col-span-2">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-300">
            Cadence de la partie privée
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {TIME_CONTROLS.map((control) => (
              <button
                key={control.minutes}
                type="button"
                onClick={() => setMinutes(control.minutes)}
                className={[
                  "rounded-xl border px-3 py-2 text-sm font-black transition",
                  minutes === control.minutes
                    ? "border-blue-400 bg-blue-600 text-white"
                    : "border-gray-700 bg-gray-950 text-gray-400 hover:border-gray-500",
                ].join(" ")}
              >
                {control.duration}
              </button>
            ))}
          </div>
        </div>
      )}
      {view === "matchmaking" && (
      <div className="overflow-hidden rounded-2xl border border-blue-700/70 bg-gradient-to-br from-blue-950 via-gray-900 to-violet-950 p-6 lg:col-span-2">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
              Matchmaking classé
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Trouve un adversaire de ton niveau
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              La recherche privilégie un joueur situé à moins de 250 points
              Elo. Ton classement évolue à la fin de la partie, sans énergie
              à attendre ni publicité entre deux duels.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 md:max-w-md">
            <div>
              <p className="text-sm font-semibold text-gray-200">
                Choisis ton arène
              </p>
              <div
                role="radiogroup"
                aria-label="Cadence de la partie"
                className="mt-2 grid grid-cols-3 gap-2"
              >
                {TIME_CONTROLS.map((control) => (
                  <button
                    key={control.minutes}
                    type="button"
                    role="radio"
                    aria-checked={minutes === control.minutes}
                    onClick={() => setMinutes(control.minutes)}
                    className={[
                      "min-h-20 rounded-xl border p-2 text-left transition",
                      minutes === control.minutes
                        ? "border-blue-300 bg-blue-500 text-white shadow-lg shadow-blue-950/40"
                        : "border-blue-900 bg-gray-950/80 text-gray-400 hover:border-blue-700 hover:text-white",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-black">
                      {control.label}
                    </span>
                    <span className="mt-0.5 block text-xs font-bold">
                      {control.duration}
                    </span>
                    <span className="mt-1 hidden text-[10px] opacity-75 sm:block">
                      {control.description}
                    </span>
                  </button>
                ))}
              </div>
              <details className="mt-2 text-xs text-gray-400">
                <summary className="cursor-pointer py-1 font-semibold hover:text-gray-200">
                  Autres cadences
                </summary>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {EXTRA_TIME_CONTROLS.map((control) => (
                    <button
                      key={control.minutes}
                      type="button"
                      onClick={() => setMinutes(control.minutes)}
                      className={[
                        "rounded-lg border px-3 py-2 font-bold",
                        minutes === control.minutes
                          ? "border-blue-400 bg-blue-950 text-blue-100"
                          : "border-gray-700 bg-gray-950 hover:border-gray-500",
                      ].join(" ")}
                    >
                      {control.label}
                    </button>
                  ))}
                </div>
              </details>
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void onFindMatch(minutes)}
              className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoading
                ? "Recherche en cours…"
                : `Jouer maintenant · ${minutes} min`}
            </button>
          </div>
        </div>
      </div>
      )}

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
          Inviter un ami
        </p>
        <h2 className="mt-2 text-xl font-bold text-white">
          Créer une nouvelle partie
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          Tu joueras avec les Blancs. Un code privé sera généré pour ton
          adversaire.
        </p>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => void onCreate(minutes)}
          className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading ? "Création…" : "Créer l’invitation"}
        </button>
      </div>

      <form
        onSubmit={submitJoin}
        className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
          Rejoindre un ami
        </p>
        <h2 className="mt-2 text-xl font-bold text-white">
          J’ai reçu un code
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          Saisis les six caractères de l’invitation. Tu joueras avec les Noirs.
        </p>

        <label className="mt-5 block text-sm font-semibold text-gray-300">
          Code de partie
          <input
            value={inviteCode}
            onChange={(event) =>
              setInviteCode(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 8),
              )
            }
            placeholder="EX. K7M2QX"
            autoComplete="off"
            className="mt-2 w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 font-mono text-lg uppercase tracking-[0.25em] text-white outline-none placeholder:tracking-normal focus:border-blue-500"
          />
        </label>

        <button
          type="submit"
          disabled={isLoading || inviteCode.length < 6}
          className="mt-5 w-full rounded-xl border border-blue-700 bg-blue-950/30 px-4 py-3 text-sm font-bold text-blue-200 transition hover:bg-blue-900/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Rejoindre la partie
        </button>
      </form>

      {view === "friend" && (
        <p className="rounded-xl border border-blue-900/60 bg-blue-950/20 px-4 py-3 text-center text-xs text-blue-200 lg:col-span-2">
          Les parties privées n’affectent pas ton Elo. Partage simplement le code avec ton ami.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-200 lg:col-span-2"
        >
          {error}
        </p>
      )}
    </section>
  );
}
