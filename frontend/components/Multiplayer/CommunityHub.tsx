"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import { COMMUNITY_AVATARS } from "@/lib/community/avatars";
import type {
  CommunityClan,
  CommunityDashboard,
  CommunityMember,
} from "@/lib/community/types";

export default function CommunityHub({
  currentUser,
}: {
  currentUser: CurrentUser | null;
}) {
  const [dashboard, setDashboard] = useState<CommunityDashboard | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(currentUser));

  const loadDashboard = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/community", { cache: "no-store" });
      const payload = (await response.json()) as
        | { dashboard: CommunityDashboard }
        | { message?: string };
      if (!response.ok || !("dashboard" in payload)) {
        throw new Error(
          "message" in payload && payload.message
            ? payload.message
            : "La communauté ne peut pas être chargée.",
        );
      }
      setDashboard(payload.dashboard);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "La communauté ne peut pas être chargée.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  async function mutate(url: string, init: RequestInit) {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          payload.message ?? "Cette action n’a pas pu être enregistrée.",
        );
      }
      await loadDashboard();
      window.dispatchEvent(new Event("community:updated"));
      return true;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Cette action n’a pas pu être enregistrée.",
      );
      setIsLoading(false);
      return false;
    }
  }

  if (!currentUser) {
    return (
      <section className="rounded-2xl border border-violet-900/60 bg-violet-950/20 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
          Communauté
        </p>
        <h2 className="mt-2 text-2xl font-black text-white">
          Ton identité de joueur commence ici
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400">
          Crée ton profil pour ajouter des amis, rejoindre une ligue mensuelle
          et rapporter des points à ton clan.
        </p>
        <Link
          href="/auth"
          className="mt-5 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500"
        >
          Créer mon compte
        </Link>
      </section>
    );
  }

  if (!dashboard) {
    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
        <p className="text-gray-400">
          {isLoading ? "Ouverture de la communauté…" : error}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-blue-900/60 bg-gradient-to-r from-blue-950/35 via-gray-900 to-red-950/25 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">
              Place du clan
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Retrouve ta troupe, puis pars au combat
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Tes amis et ton clan restent à portée de clic. Le reste peut attendre la fin du duel.
            </p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:min-w-[28rem]">
            <SocialShortcut
              href="#community-friends"
              icon="♞"
              eyebrow="Cercle d’amis"
              title={`${dashboard.friends.length} ami${dashboard.friends.length > 1 ? "s" : ""}`}
              description="Ajouter, comparer, défier"
              color="blue"
            />
            <SocialShortcut
              href="#community-clan"
              icon="⚔"
              eyebrow="Mon clan"
              title={dashboard.clan ? `[${dashboard.clan.tag}] ${dashboard.clan.name}` : "Trouver ma bannière"}
              description={dashboard.clan ? `${dashboard.clan.monthlyPoints} points ce mois` : "Créer ou rejoindre un clan"}
              color="red"
            />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <FriendsPanel
          friends={dashboard.friends}
          isLoading={isLoading}
          onAdd={(query) =>
            mutate("/api/community/friends", {
              method: "POST",
              body: JSON.stringify({ query }),
            })
          }
        />
        <ClanPanel
          clan={dashboard.clan}
          expedition={dashboard.clanExpedition}
          leaderboard={dashboard.clanLeaderboard}
          isLoading={isLoading}
          onAction={(body) =>
            mutate("/api/community/clans", {
              method: "POST",
              body: JSON.stringify(body),
            })
          }
        />
      </div>

      <LeaguePanel dashboard={dashboard} />

      <AvatarCollection
        rating={dashboard.profile.rating}
        selectedAvatarId={dashboard.profile.avatarId}
        isLoading={isLoading}
        onSelect={(avatarId) =>
          mutate("/api/community/avatar", {
            method: "PATCH",
            body: JSON.stringify({ avatarId }),
          })
        }
      />

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-200"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function SocialShortcut({
  href,
  icon,
  eyebrow,
  title,
  description,
  color,
}: {
  href: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  color: "blue" | "red";
}) {
  const styles =
    color === "blue"
      ? "border-blue-800/70 bg-blue-950/35 hover:border-blue-500"
      : "border-red-800/70 bg-red-950/30 hover:border-red-500";

  return (
    <a
      href={href}
      className={`group flex items-center gap-3 rounded-xl border p-3 transition ${styles}`}
    >
      <span
        aria-hidden="true"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-950/70 text-xl text-white"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
          {eyebrow}
        </span>
        <span className="block truncate text-sm font-black text-white">
          {title}
        </span>
        <span className="block truncate text-[11px] text-gray-500">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="text-gray-600 transition group-hover:translate-x-0.5 group-hover:text-white"
      >
        →
      </span>
    </a>
  );
}

function AvatarCollection({
  rating,
  selectedAvatarId,
  isLoading,
  onSelect,
}: {
  rating: number;
  selectedAvatarId: string;
  isLoading: boolean;
  onSelect: (avatarId: string) => Promise<boolean>;
}) {
  const unlockedCount = COMMUNITY_AVATARS.filter(
    (avatar) => rating >= avatar.requiredRating,
  ).length;
  const selectedAvatar =
    COMMUNITY_AVATARS.find((avatar) => avatar.id === selectedAvatarId) ??
    COMMUNITY_AVATARS[0];

  return (
    <details className="group overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:content-none">
        <Image
          src={selectedAvatar.image}
          alt=""
          width={48}
          height={48}
          className="h-11 w-11 rounded-lg border border-violet-800/60 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-300">
            Collection de chevaliers
          </p>
          <p className="truncate text-sm font-bold text-white">
            {selectedAvatar.name} · {unlockedCount}/{COMMUNITY_AVATARS.length} débloqués
          </p>
        </div>
        <span className="rounded-lg border border-gray-700 px-2.5 py-1.5 text-xs font-bold text-gray-400 transition group-open:rotate-180">
          ↓
        </span>
      </summary>
      <div className="grid grid-cols-2 gap-2 border-t border-gray-800 p-3 sm:grid-cols-3 lg:grid-cols-5">
        {COMMUNITY_AVATARS.map((avatar) => {
          const unlocked = rating >= avatar.requiredRating;
          const selected = selectedAvatarId === avatar.id;
          return (
            <button
              key={avatar.id}
              type="button"
              disabled={!unlocked || isLoading}
              onClick={() => void onSelect(avatar.id)}
              className={[
                "flex min-w-0 items-center gap-2 rounded-xl border p-2 text-left transition",
                selected
                  ? "border-violet-500 bg-violet-950/35"
                  : unlocked
                    ? "border-gray-700 bg-gray-950/60 hover:border-violet-700"
                    : "border-gray-800 bg-gray-950/30 opacity-55",
              ].join(" ")}
            >
              <Image
                src={avatar.image}
                alt=""
                width={56}
                height={56}
                className="h-12 w-12 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-white">
                  {avatar.name}
                </span>
                <span className="mt-0.5 block text-[10px] leading-4 text-gray-500">
                  {unlocked
                    ? selected
                      ? "Équipé"
                      : avatar.rarity
                    : `${avatar.requiredRating} Elo`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </details>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-950/60 px-3 py-2 text-center">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </p>
    </div>
  );
}

function FriendsPanel({
  friends,
  isLoading,
  onAdd,
}: {
  friends: CommunityMember[];
  isLoading: boolean;
  onAdd: (query: string) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await onAdd(query)) setQuery("");
  }

  return (
    <section
      id="community-friends"
      className="scroll-mt-24 rounded-2xl border border-blue-900/60 bg-gradient-to-br from-blue-950/25 to-gray-900 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-400">
            Cercle d’amis
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            Ta bande de joueurs
          </h2>
        </div>
        <span className="rounded-full border border-blue-800/70 bg-blue-950/50 px-3 py-1 text-xs font-black text-blue-200">
          {friends.length} ami{friends.length > 1 ? "s" : ""}
        </span>
      </div>
      <form onSubmit={(event) => void submit(event)} className="mt-4 flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pseudo ou e-mail exact"
          className="min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || query.trim().length < 2}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>
      <div className="mt-4 space-y-2">
        {friends.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-500">
            Ajoute ton premier ami pour comparer vos résultats.
          </p>
        ) : (
          friends.map((friend, index) => (
            <MemberRow key={friend.id} member={friend} rank={index + 1} />
          ))
        )}
      </div>
    </section>
  );
}

function MemberRow({
  member,
  rank,
}: {
  member: CommunityMember;
  rank: number;
}) {
  const avatar =
    COMMUNITY_AVATARS.find((item) => item.id === member.avatarId) ??
    COMMUNITY_AVATARS[0];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-950/55 p-3">
      <span className="w-5 text-center text-xs font-bold text-gray-500">
        {rank}
      </span>
      <Image
        src={avatar.image}
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{member.name}</p>
        <p className="text-xs text-gray-500">
          {member.wins} V · {member.losses} D · {member.draws} N
        </p>
      </div>
      <span className="font-black text-blue-300">{member.rating}</span>
    </div>
  );
}

function LeaguePanel({ dashboard }: { dashboard: CommunityDashboard }) {
  return (
    <section className="rounded-2xl border border-amber-900/50 bg-gradient-to-br from-amber-950/25 to-gray-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-400">
        Saison de {dashboard.league.monthLabel}
      </p>
      <h2 className="mt-1 text-xl font-bold text-white">
        {dashboard.league.tier}
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <ProfileStat label="Points de ligue" value={dashboard.league.points} />
        <ProfileStat label="Rang entre amis" value={dashboard.league.rank} />
      </div>
      <p className="mt-4 text-sm leading-6 text-gray-400">
        Une victoire rapporte 3 points, une nulle 1 point. Le classement est
        remis à zéro au début de chaque mois.
      </p>
    </section>
  );
}

function ClanPanel({
  clan,
  expedition,
  leaderboard,
  isLoading,
  onAction,
}: {
  clan: CommunityClan | null;
  expedition: CommunityDashboard["clanExpedition"];
  leaderboard: CommunityClan[];
  isLoading: boolean;
  onAction: (
    body:
      | { action: "create"; name: string; tag: string }
      | { action: "join"; tag: string },
  ) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");

  return (
    <section
      id="community-clan"
      className="scroll-mt-24 rounded-2xl border border-red-900/60 bg-gradient-to-br from-red-950/25 to-gray-900 p-5"
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-400">
            Guerre des clans
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            {clan ? `[${clan.tag}] ${clan.name}` : "Rejoins une bannière"}
          </h2>
          {clan ? (
            <>
              <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/20 p-4">
                <p className="text-3xl font-black text-white">
                  {clan.monthlyPoints}
                </p>
                <p className="text-xs uppercase tracking-wide text-red-300">
                  points rapportés ce mois
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  {clan.memberCount} chevalier
                  {clan.memberCount > 1 ? "s" : ""} dans le clan
                </p>
              </div>
              {expedition && <ClanExpeditionPanel expedition={expedition} />}
            </>
          ) : (
            <div className="mt-4 space-y-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nom du nouveau clan"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white"
              />
              <input
                value={tag}
                onChange={(event) =>
                  setTag(
                    event.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 8),
                  )
                }
                placeholder="TAG"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm uppercase text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isLoading || name.trim().length < 3 || tag.length < 2}
                  onClick={() =>
                    void onAction({ action: "create", name, tag })
                  }
                  className="rounded-xl bg-red-700 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  Créer
                </button>
                <button
                  type="button"
                  disabled={isLoading || tag.length < 2}
                  onClick={() => void onAction({ action: "join", tag })}
                  className="rounded-xl border border-red-800 px-3 py-2.5 text-sm font-bold text-red-200 disabled:opacity-50"
                >
                  Rejoindre par tag
                </button>
              </div>
            </div>
          )}
        </div>
        <details className="group overflow-hidden rounded-xl border border-gray-800 bg-gray-950/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 marker:content-none">
            <p className="text-sm font-bold text-white">
              Classement des clans · {new Date().toLocaleDateString("fr-FR", {
                month: "long",
              })}
            </p>
            <span className="text-xs text-gray-500 transition group-open:rotate-180">
              ↓
            </span>
          </summary>
          <div className="space-y-2 border-t border-gray-800 p-3">
            {leaderboard.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-500">
                Le premier clan de la saison peut encore être le tien.
              </p>
            ) : (
              leaderboard.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-950/55 p-3"
                >
                  <span className="w-6 text-center font-black text-gray-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      [{item.tag}] {item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.memberCount} membres
                    </p>
                  </div>
                  <span className="font-black text-red-300">
                    {item.monthlyPoints} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </details>
      </div>
    </section>
  );
}

function ClanExpeditionPanel({
  expedition,
}: {
  expedition: NonNullable<CommunityDashboard["clanExpedition"]>;
}) {
  const progress = Math.min(
    100,
    (expedition.medals / expedition.goal) * 100,
  );

  return (
    <details
      open
      className="mt-3 overflow-hidden rounded-xl border border-orange-900/60 bg-gray-950/45"
    >
      <summary className="cursor-pointer list-none p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-300">
              Expédition hebdomadaire
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {expedition.stage}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Semaine du {expedition.weekLabel}
            </p>
          </div>
          <span className="text-2xl" aria-hidden="true">
            ⚔️
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="font-bold text-gray-400">
            {expedition.nextStageAt
              ? `Prochaine étape à ${expedition.nextStageAt}`
              : "Citadelle conquise !"}
          </span>
          <span className="font-black text-orange-300">
            {expedition.medals}/{expedition.goal} médailles
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-600 via-amber-400 to-yellow-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </summary>

      <div className="border-t border-gray-800 px-4 py-3">
        <p className="text-[11px] leading-5 text-gray-500">
          4 médailles par victoire, 2 par nulle et 1 par défaite. Oui, même une
          partie où tu es maté sauvagement fait avancer la troupe.
        </p>
        <div className="mt-3 space-y-2">
          {expedition.contributions.map((member, index) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg bg-gray-900/80 px-3 py-2"
            >
              <span className="w-5 text-center text-xs font-black text-gray-600">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">
                  {member.name}
                </p>
                <p className="text-[10px] text-gray-500">
                  {member.games} partie{member.games > 1 ? "s" : ""} ·{" "}
                  {member.wins} V · {member.draws} N · {member.losses} D
                </p>
              </div>
              <span className="text-xs font-black text-orange-300">
                {member.medals} ⚔
              </span>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
