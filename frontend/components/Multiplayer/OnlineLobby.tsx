"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";

export default function OnlineLobby({
  currentUser,
  isLoading,
  error,
  onCreate,
  onJoin,
  onFindMatch,
}: {
  currentUser: CurrentUser | null;
  isLoading: boolean;
  error: string;
  onCreate: (minutes: number) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
  onFindMatch: (minutes: number) => Promise<void>;
}) {
  const [minutes, setMinutes] = useState(10);
  const [inviteCode, setInviteCode] = useState("");

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
              Elo. Ton classement évolue à la fin de la partie.
            </p>
          </div>
          <div className="flex min-w-64 flex-col gap-3">
            <label className="text-sm font-semibold text-gray-200">
              Cadence
              <select
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-blue-800 bg-gray-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value={1}>1 minute — Bullet</option>
                <option value={3}>3 minutes — Blitz</option>
                <option value={5}>5 minutes — Blitz</option>
                <option value={10}>10 minutes — Rapide conseillé</option>
                <option value={15}>15 minutes — Rapide confortable</option>
              </select>
            </label>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void onFindMatch(minutes)}
              className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoading ? "Recherche en cours…" : "Trouver une partie"}
            </button>
          </div>
        </div>
      </div>

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
