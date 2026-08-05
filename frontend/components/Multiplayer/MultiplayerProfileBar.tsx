"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import { getCommunityAvatar } from "@/lib/community/avatars";
import type { CommunityDashboard } from "@/lib/community/types";
import { getBattleBanner } from "@/lib/rewards/banners";

export default function MultiplayerProfileBar({
  currentUser,
  onOpenCommunity,
}: {
  currentUser: CurrentUser | null;
  onOpenCommunity: () => void;
}) {
  const [dashboard, setDashboard] = useState<CommunityDashboard | null>(null);

  const loadProfile = useCallback(async () => {
    if (!currentUser) {
      setDashboard(null);
      return;
    }

    try {
      const response = await fetch("/api/community", { cache: "no-store" });
      const payload = (await response.json()) as {
        dashboard?: CommunityDashboard;
      };
      if (response.ok && payload.dashboard) setDashboard(payload.dashboard);
    } catch {
      // Le nom du compte reste visible si le profil communautaire est indisponible.
    }
  }, [currentUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProfile(), 0);
    window.addEventListener("community:updated", loadProfile);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("community:updated", loadProfile);
    };
  }, [loadProfile]);

  if (!currentUser) {
    return (
      <section className="mx-auto flex max-w-5xl items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/85 p-3">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-violet-950/60 text-2xl text-violet-200"
        >
          ♞
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-300">
            Profil de chevalier
          </p>
          <p className="truncate text-sm font-bold text-white">
            Rejoins ton clan sur tous tes appareils
          </p>
        </div>
        <Link
          href="/auth"
          className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white transition hover:bg-violet-500"
        >
          Connexion
        </Link>
      </section>
    );
  }

  const profile = dashboard?.profile;
  const avatar = getCommunityAvatar(profile?.avatarId ?? "iron-squire");
  const banner = getBattleBanner(profile?.bannerId ?? "");
  const clan = dashboard?.clan;

  return (
    <section
      className={`mx-auto flex max-w-5xl items-center gap-3 overflow-hidden rounded-xl border bg-gradient-to-r p-2.5 sm:p-3 ${banner.panelClass}`}
      aria-label="Profil multijoueur"
    >
      <Image
        src={avatar.image}
        alt={avatar.name}
        width={64}
        height={64}
        className="h-12 w-12 shrink-0 rounded-lg border border-violet-500/50 object-cover shadow-lg sm:h-14 sm:w-14"
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-black text-white sm:text-base">
            {profile?.name ?? currentUser.name}
          </p>
          {clan && (
            <span className="shrink-0 rounded-md bg-red-950/60 px-1.5 py-0.5 text-[10px] font-black text-red-200">
              [{clan.tag}]
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
          <span className="font-bold text-blue-300">
            {profile ? `${profile.rating} Elo` : "Profil en chargement…"}
          </span>
          <span className="hidden sm:inline">
            {avatar.name} · {banner.icon} {banner.name}
          </span>
          {profile && (
            <span className="hidden md:inline">
              {profile.wins} V · {profile.losses} D · {profile.draws} N
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenCommunity}
        className="shrink-0 rounded-lg border border-violet-700/70 bg-gray-950/50 px-3 py-2 text-xs font-black text-violet-100 transition hover:border-violet-400 hover:bg-violet-950/60"
      >
        <span className="sm:hidden">Clan</span>
        <span className="hidden sm:inline">Amis & clan</span>
      </button>
    </section>
  );
}
