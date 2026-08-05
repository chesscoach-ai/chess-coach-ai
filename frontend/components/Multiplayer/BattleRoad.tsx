"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import type { BattleRewardDashboard } from "@/lib/rewards/battleRewardStore";
import {
  BATTLE_BANNERS,
  getBattleBanner,
  type BattleBannerId,
} from "@/lib/rewards/banners";

export default function BattleRoad({
  currentUser,
  refreshKey,
  onPlay,
}: {
  currentUser: CurrentUser | null;
  refreshKey: string;
  onPlay: () => void;
}) {
  const [rewards, setRewards] =
    useState<BattleRewardDashboard | null>(
      null,
    );
  const [error, setError] =
    useState("");
  const [isLoading, setIsLoading] =
    useState(Boolean(currentUser));
  const [isOpening, setIsOpening] =
    useState(false);
  const [savingBannerId, setSavingBannerId] =
    useState<BattleBannerId | null>(null);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        "/api/multiplayer/rewards",
        { cache: "no-store" },
      );
      const payload =
        (await response.json()) as {
          rewards?: BattleRewardDashboard;
          message?: string;
        };
      if (
        !response.ok ||
        !payload.rewards
      ) {
        throw new Error(
          payload.message ??
            "La route des trophées est momentanément fermée.",
        );
      }
      setRewards(payload.rewards);
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "La route des trophées est momentanément fermée.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void load();
      },
      0,
    );
    return () =>
      window.clearTimeout(timer);
  }, [load, refreshKey]);

  async function openChest(): Promise<void> {
    setIsOpening(true);
    try {
      const response = await fetch(
        "/api/multiplayer/rewards",
        { method: "POST" },
      );
      const payload =
        (await response.json()) as {
          rewards?: BattleRewardDashboard;
          message?: string;
        };
      if (
        !response.ok ||
        !payload.rewards
      ) {
        throw new Error(
          payload.message ??
            "Le coffre refuse de s’ouvrir.",
        );
      }
      setRewards(payload.rewards);
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Le coffre refuse de s’ouvrir.",
      );
    } finally {
      setIsOpening(false);
    }
  }

  async function updateBanner(
    action: "unlock" | "equip",
    bannerId: BattleBannerId,
  ): Promise<void> {
    setSavingBannerId(bannerId);
    try {
      const response = await fetch(
        "/api/multiplayer/rewards/cosmetics",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, bannerId }),
        },
      );
      const payload = (await response.json()) as {
        rewards?: BattleRewardDashboard;
        message?: string;
      };
      if (!response.ok || !payload.rewards) {
        throw new Error(
          payload.message ?? "La forge a perdu son marteau.",
        );
      }
      setRewards(payload.rewards);
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "La forge a perdu son marteau.",
      );
    } finally {
      setSavingBannerId(null);
    }
  }

  if (!currentUser) {
    return (
      <section className="rounded-2xl border border-amber-900/50 bg-gradient-to-r from-amber-950/25 to-gray-900 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">
              Route des trophées
            </p>
            <p className="mt-1 text-sm text-gray-300">
              Crée ton identité de chevalier pour gagner des couronnes et des apparences.
            </p>
          </div>
          <Link
            href="/auth"
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-gray-950"
          >
            Entrer dans l’arène
          </Link>
        </div>
      </section>
    );
  }

  if (!rewards) {
    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900 px-4 py-4 text-sm text-gray-400">
        {isLoading
          ? "Préparation de l’arène…"
          : error}
      </section>
    );
  }

  const crownProgress = Math.min(
    100,
    (rewards.crowns /
      rewards.crownGoal) *
      100,
  );
  const arenaProgress =
    rewards.arena.nextAt === null
      ? 100
      : Math.min(
          100,
          ((rewards.rating -
            rewards.arena.floor) /
            (rewards.arena.nextAt -
              rewards.arena.floor)) *
            100,
        );
  const chestReady =
    rewards.crowns >=
    rewards.crownGoal;
  const selectedBanner = getBattleBanner(rewards.selectedBannerId);

  return (
    <details
      className={[
        "group overflow-hidden rounded-2xl border bg-gradient-to-br shadow-lg",
        selectedBanner.panelClass,
      ].join(" ")}
    >
      <summary className="grid cursor-pointer list-none gap-3 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-700/50 bg-amber-950/35 text-xl">
            {rewards.arena.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">
              Route des trophées
            </p>
            <p className="truncate text-sm font-black text-white">
              {rewards.arena.name}
            </p>
            <p className="text-[11px] text-gray-500">
              {rewards.rating} Elo
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-gray-300">
              Coffre quotidien
            </span>
            <span className="font-black text-amber-300">
              👑{" "}
              {Math.min(
                rewards.crowns,
                rewards.crownGoal,
              )}
              /{rewards.crownGoal}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all"
              style={{
                width: `${crownProgress}%`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-xs font-black text-violet-200">
            ◆ {rewards.bannerShards}
          </span>
          <span className="text-amber-300 transition group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>

      <div className="grid gap-3 border-t border-amber-900/40 p-3 sm:grid-cols-2 sm:p-4">
        <div className="rounded-xl border border-gray-800 bg-gray-950/45 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                Prochaine arène
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {rewards.arena.nextAt
                  ? `${rewards.arena.nextAt} Elo`
                  : "Sommet atteint"}
              </p>
            </div>
            <span className="text-2xl">
              🏰
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-violet-500"
              style={{
                width: `${arenaProgress}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            L’Elo mesure uniquement tes résultats classés. Aucun coffre ne peut l’acheter.
          </p>
        </div>

        <div
          className={[
            "rounded-xl border p-4",
            chestReady
              ? "border-amber-600/70 bg-amber-950/30"
              : "border-gray-800 bg-gray-950/45",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-300">
                Coffre de couronnes
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {rewards.claimed
                  ? `${rewards.chestShards} éclats de bannière récupérés`
                  : chestReady
                    ? "Ton coffre tremble d’impatience"
                    : "Deux victoires suffisent pour l’ouvrir"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                3 couronnes par victoire, 1 par nulle. Les défaites ne coûtent aucune récompense.
              </p>
            </div>
            <span className="text-3xl">
              {rewards.claimed
                ? "✨"
                : "🎁"}
            </span>
          </div>
          {chestReady &&
          !rewards.claimed ? (
            <button
              type="button"
              disabled={isOpening}
              onClick={() => {
                void openChest();
              }}
              className="mt-3 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-gray-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              {isOpening
                ? "Le coffre s’ouvre…"
                : `Ouvrir · +${rewards.chestShards} ◆`}
            </button>
          ) : !rewards.claimed ? (
            <button
              type="button"
              onClick={onPlay}
              className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-500"
            >
              Chercher un adversaire
            </button>
          ) : null}
        </div>
      </div>

      <details className="border-t border-gray-800/80">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-300">
              Vestiaire des bannières
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {selectedBanner.icon} {selectedBanner.name} équipée · ◆{" "}
              {rewards.bannerShards} éclats
            </p>
          </div>
          <span className="text-sm font-bold text-gray-400">
            Ouvrir la collection
          </span>
        </summary>
        <div className="grid gap-3 border-t border-gray-800/70 bg-gray-950/35 p-3 sm:grid-cols-2 lg:grid-cols-5 sm:p-4">
          {BATTLE_BANNERS.map((banner) => {
            const unlocked = rewards.unlockedBannerIds.includes(banner.id);
            const selected = rewards.selectedBannerId === banner.id;
            const affordable = rewards.bannerShards >= banner.cost;
            return (
              <article
                key={banner.id}
                className={[
                  "overflow-hidden rounded-xl border bg-gray-950/70",
                  selected ? "border-violet-400" : "border-gray-800",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-20 items-center justify-center bg-gradient-to-br text-3xl",
                    banner.cardClass,
                  ].join(" ")}
                >
                  <span aria-hidden="true">{banner.icon}</span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-black text-white">{banner.name}</p>
                  <p className="mt-1 min-h-10 text-[11px] leading-4 text-gray-500">
                    {banner.description}
                  </p>
                  <button
                    type="button"
                    disabled={
                      selected ||
                      savingBannerId !== null ||
                      (!unlocked && !affordable)
                    }
                    onClick={() =>
                      void updateBanner(
                        unlocked ? "equip" : "unlock",
                        banner.id,
                      )
                    }
                    className={[
                      "mt-3 w-full rounded-lg px-2 py-2 text-xs font-black disabled:cursor-not-allowed",
                      selected
                        ? "bg-violet-950/60 text-violet-300"
                        : unlocked
                          ? "bg-violet-600 text-white hover:bg-violet-500"
                          : affordable
                            ? "bg-amber-500 text-gray-950 hover:bg-amber-400"
                            : "bg-gray-800 text-gray-500",
                    ].join(" ")}
                  >
                    {savingBannerId === banner.id
                      ? "Forge en cours…"
                      : selected
                        ? "Équipée"
                        : unlocked
                          ? "Équiper"
                          : `Forger · ${banner.cost} ◆`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <p className="border-t border-gray-800/70 px-4 py-3 text-[11px] leading-5 text-gray-500">
          Les bannières personnalisent ton profil mais ne modifient jamais tes
          pièces, ton Elo ou tes chances de gagner.
        </p>
      </details>

      {error && (
        <p
          role="status"
          className="border-t border-red-900/50 bg-red-950/25 px-4 py-2 text-xs text-red-200"
        >
          {error}
        </p>
      )}
    </details>
  );
}
