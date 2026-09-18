"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import { trackBetaEvent } from "@/lib/beta/client";
import { getCommunityAvatar } from "@/lib/community/avatars";
import { buildClanPreview, resolveClanPreview } from "@/lib/community/clanPreview";
import type { CommunityClanMember, CommunityDashboard } from "@/lib/community/types";

type ClanAction =
  | { action: "create"; name: string; tag: string }
  | { action: "join"; inviteCode: string }
  | { action: "rotate-invite" }
  | { action: "leave" };

export default function CommunityHub({ currentUser, onPlay }: {
  currentUser: CurrentUser | null;
  onPlay: (kind?: "friend" | "online") => void;
}) {
  const searchParams = useSearchParams();
  const preview = resolveClanPreview(searchParams.get("clanPreview"), process.env.NODE_ENV);
  const previewDashboard = useMemo(() => preview ? buildClanPreview(preview) : null, [preview]);
  const [dashboard, setDashboard] = useState<CommunityDashboard | null>(previewDashboard);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(preview ? "Aperçu DEV : aucune donnée réelle ne sera modifiée." : "");
  const [isLoading, setIsLoading] = useState(Boolean(currentUser) && !preview);
  const viewed = useRef(false);
  const clanId = dashboard?.clan?.id ?? null;
  const goalCompleted = dashboard?.clanWeeklyGoal?.completed ?? null;

  const loadDashboard = useCallback(async () => {
    if (previewDashboard) { setDashboard(previewDashboard); setIsLoading(false); return; }
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/community", { cache: "no-store" });
      const payload = (await response.json()) as { dashboard?: CommunityDashboard; message?: string };
      if (!response.ok || !payload.dashboard) throw new Error(payload.message ?? "L’espace Clan ne peut pas être chargé.");
      setDashboard(payload.dashboard);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "L’espace Clan ne peut pas être chargé.");
    } finally { setIsLoading(false); }
  }, [currentUser, previewDashboard]);

  useEffect(() => { const timer = window.setTimeout(() => void loadDashboard(), 0); return () => window.clearTimeout(timer); }, [loadDashboard]);
  useEffect(() => { if (!viewed.current) { viewed.current = true; trackBetaEvent("clan_viewed"); } }, []);
  useEffect(() => {
    if (!clanId) return;
    trackBetaEvent("clan_activity_viewed");
    if (goalCompleted !== null) {
      trackBetaEvent("clan_goal_viewed");
      if (goalCompleted) trackBetaEvent("clan_goal_completed");
    }
  }, [clanId, goalCompleted]);

  async function mutate(url: string, init: RequestInit, successMessage?: string) {
    if (preview) { setNotice("Aperçu DEV confirmé : l’action est simulée, aucune donnée réelle n’a changé."); return true; }
    setIsLoading(true); setError("");
    try {
      const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Cette action n’a pas pu être enregistrée.");
      if (successMessage) setNotice(successMessage);
      await loadDashboard();
      window.dispatchEvent(new Event("community:updated"));
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Cette action n’a pas pu être enregistrée.");
      setIsLoading(false); return false;
    }
  }

  async function clanAction(body: ClanAction): Promise<boolean> {
    const ok = await mutate("/api/community/clans", { method: "POST", body: JSON.stringify(body) }, body.action === "leave" ? "Tu as quitté la troupe." : undefined);
    if (ok && body.action === "create") trackBetaEvent("clan_created");
    if (ok && body.action === "join") { trackBetaEvent("clan_joined"); trackBetaEvent("clan_invite_accepted"); }
    if (ok && body.action === "rotate-invite") trackBetaEvent("clan_invite_created");
    return ok;
  }

  if (!currentUser && !preview) return <GuestClanValue />;
  if (!dashboard) return <section className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center"><p className="text-gray-400">{isLoading ? "Nox rassemble la troupe…" : error || "Le clan est momentanément indisponible."}</p>{!isLoading && <button type="button" onClick={() => void loadDashboard()} className="mt-4 rounded-xl border border-gray-700 px-4 py-2 text-sm font-bold text-white">Réessayer</button>}</section>;

  return (
    <div className="mx-auto max-w-6xl space-y-4" data-clan-preview={preview ?? undefined}>
      <ClanHome dashboard={dashboard} inviteFromUrl={searchParams.get("clanInvite") ?? ""} isLoading={isLoading} onAction={clanAction} onPrivacy={(shareProgress) => mutate("/api/community/privacy", { method: "PATCH", body: JSON.stringify({ shareProgress }) }, shareProgress ? "Ta progression générale est maintenant visible par le clan." : "Ta progression est redevenue privée.")} onNotice={setNotice} />
      <ClanActivity dashboard={dashboard} />
      <PlayTogether dashboard={dashboard} isLoading={isLoading} onAddFriend={(query) => mutate("/api/community/friends", { method: "POST", body: JSON.stringify({ query }) }, "Le joueur rejoint ton cercle d’amis.")} onChallenge={() => { trackBetaEvent("clan_challenge_sent"); trackBetaEvent("clan_challenge_started"); onPlay("friend"); }} onQuickPlay={() => onPlay("online")} />
      {(notice || error) && <p role={error ? "alert" : "status"} className={`rounded-xl border p-3 text-sm ${error ? "border-red-900 bg-red-950/30 text-red-200" : "border-indigo-900 bg-indigo-950/25 text-indigo-200"}`}>{error || notice}</p>}
    </div>
  );
}

function GuestClanValue() {
  return <section className="mx-auto max-w-3xl rounded-2xl border border-indigo-800/70 bg-gradient-to-br from-indigo-950/55 to-gray-900 p-6 text-center sm:p-8"><span className="text-4xl" aria-hidden="true">⚔️</span><p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-indigo-300">Clan Knightly</p><h2 className="mt-2 text-2xl font-black text-white">Progresse avec une petite troupe</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-300">Jouez ensemble, lancez des défis amicaux et faites avancer un objectif commun. Le Clan reste gratuit pour tous.</p><Link href="/auth" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-indigo-600 px-5 font-black text-white">Créer mon compte</Link><p className="mt-3 text-xs text-gray-500">Consulter est simple ; rejoindre durablement demande un compte pour protéger la troupe.</p></section>;
}

function ClanHome({ dashboard, inviteFromUrl, isLoading, onAction, onPrivacy, onNotice }: { dashboard: CommunityDashboard; inviteFromUrl: string; isLoading: boolean; onAction: (body: ClanAction) => Promise<boolean>; onPrivacy: (share: boolean) => Promise<boolean>; onNotice: (message: string) => void; }) {
  const [name, setName] = useState(""); const [tag, setTag] = useState("");
  const [inviteCode, setInviteCode] = useState(inviteFromUrl); const [showInvite, setShowInvite] = useState(Boolean(inviteFromUrl));
  const clan = dashboard.clan;
  async function shareInvite() {
    if (!clan?.inviteCode) return;
    const url = `${window.location.origin}/?mode=multiplayer&kind=community&clanInvite=${encodeURIComponent(clan.inviteCode)}`;
    const payload = { title: `Rejoins ${clan.name} sur Knightly`, text: `Notre troupe t’attend. Code : ${clan.inviteCode}`, url };
    trackBetaEvent("clan_invite_created");
    try {
      if (navigator.share) await navigator.share(payload);
      else { await navigator.clipboard.writeText(url); onNotice("Lien d’invitation copié. Aucun e-mail ni identifiant privé n’est inclus."); }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      await navigator.clipboard.writeText(url); onNotice("Lien d’invitation copié.");
    }
  }
  return <section className="rounded-2xl border border-indigo-800/70 bg-gradient-to-br from-indigo-950/45 via-gray-900 to-gray-900 p-4 sm:p-6" aria-labelledby="clan-home-title">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-300">Mon Clan</p><h2 id="clan-home-title" className="mt-1 text-xl font-black text-white">{clan ? `[${clan.tag}] ${clan.name}` : "Trouve ta troupe"}</h2></div><span className="rounded-full border border-indigo-700 bg-indigo-950/70 px-3 py-1 text-xs font-bold text-indigo-200">Gratuit</span></div>
    {clan ? <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
      <div><p className="text-sm text-gray-300">{clan.memberCount}/12 chevaliers dans la troupe.</p><p className="mt-1 text-xs text-gray-500">Votre Elo reste distinct de l’activité collective.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setShowInvite((value) => !value); trackBetaEvent("clan_invite_created"); }} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white">Inviter</button><button type="button" disabled={isLoading} onClick={() => void onAction({ action: "leave" })} className="min-h-11 rounded-xl border border-gray-700 px-4 text-sm font-bold text-gray-300 disabled:opacity-50">Quitter</button></div>
      {showInvite && <div className="rounded-xl border border-indigo-800/70 bg-gray-950/60 p-3 lg:col-span-2"><p className="text-xs text-gray-400">Code public du clan</p><div className="mt-2 flex flex-wrap items-center gap-2"><strong className="rounded-lg bg-gray-900 px-3 py-2 font-mono text-indigo-200">{clan.inviteCode}</strong><button type="button" onClick={() => void shareInvite()} className="min-h-10 rounded-lg bg-indigo-600 px-3 text-xs font-black text-white">Partager le lien</button>{dashboard.clanRole === "owner" && <button type="button" onClick={() => void onAction({ action: "rotate-invite" })} className="min-h-10 rounded-lg border border-gray-700 px-3 text-xs font-bold text-gray-300">Renouveler</button>}</div><p className="mt-2 text-[11px] text-gray-500">Le renouvellement invalide l’ancien code. Aucune adresse e-mail n’est partagée.</p></div>}
      <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-950/45 p-3 lg:col-span-2"><span><span className="block text-sm font-bold text-white">Partager ma progression générale</span><span className="mt-1 block text-xs text-gray-500">Rang de Nox et activité générale seulement. Jamais tes erreurs, PGN ou conversations.</span></span><input type="checkbox" checked={dashboard.shareProgress} onChange={(event) => void onPrivacy(event.target.checked)} className="h-5 w-5 accent-indigo-500" /></label>
    </div> : <div className="mt-5 space-y-3">
      <div className="rounded-xl border border-indigo-700/80 bg-indigo-950/25 p-4"><h3 className="font-black text-white">Rejoindre la troupe d’un ami</h3><p className="mt-1 text-sm text-gray-400">Colle le code public qu’il t’a envoyé.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label="Code public du clan" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16))} placeholder="KLY-XXXXXXXX" className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-950 px-3 text-sm font-mono text-white" /><button type="button" disabled={isLoading || inviteCode.length < 2} onClick={() => void onAction({ action: "join", inviteCode })} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white disabled:opacity-50">Rejoindre</button></div><p className="mt-2 text-xs text-gray-500">Si le code a expiré, demande simplement un nouveau lien.</p></div>
      <details className="rounded-xl border border-gray-800 bg-gray-950/35"><summary className="cursor-pointer list-none p-4 text-sm font-bold text-gray-300">Créer plutôt mon propre clan</summary><div className="border-t border-gray-800 p-4"><p className="text-sm text-gray-500">Un nom et un emblème court suffisent.</p><input aria-label="Nom du clan" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nom du clan" className="mt-3 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white" /><input aria-label="Emblème du clan" value={tag} onChange={(event) => setTag(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} placeholder="Emblème (2 à 8 caractères)" className="mt-2 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white" /><button type="button" disabled={isLoading || name.trim().length < 3 || tag.length < 2} onClick={() => void onAction({ action: "create", name, tag })} className="mt-3 min-h-11 w-full rounded-xl border border-indigo-700 text-sm font-black text-indigo-200 disabled:opacity-50">Créer le clan</button></div></details>
    </div>}
  </section>;
}

function ClanActivity({ dashboard }: { dashboard: CommunityDashboard }) {
  const goal = dashboard.clanWeeklyGoal; const percent = goal ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
  return <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5" aria-labelledby="clan-activity-title"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">Activité</p><h2 id="clan-activity-title" className="mt-1 text-lg font-black text-white">La troupe cette semaine</h2></div>{goal?.completed && <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-black text-emerald-300">Objectif atteint 🎉</span>}</div>
    {!dashboard.clan || !goal ? <p className="mt-4 rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-500">Crée ou rejoins un clan : les parties de la troupe apparaîtront ici.</p> : <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]"><div className="rounded-xl border border-emerald-900/50 bg-emerald-950/15 p-4"><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-black text-white">{goal.label}</p><p className="mt-1 text-xs text-gray-500">{goal.weekLabel}</p></div><strong className="text-emerald-300">{goal.current}/{goal.target}</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} /></div><p className="mt-3 text-xs leading-5 text-gray-400">Chaque partie terminée fait avancer l’objectif commun.</p></div><div className="space-y-2">{dashboard.clanActivity.length === 0 ? <p className="rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-500">La troupe s’échauffe encore. Lancez une partie pour écrire la première ligne.</p> : dashboard.clanActivity.slice(0, 4).map((item) => <div key={item.id} className="flex gap-3 rounded-xl border border-gray-800 bg-gray-950/40 p-3"><span aria-hidden="true">{item.kind === "game" ? "♟️" : "⚑"}</span><p className="text-sm leading-5 text-gray-300">{item.message}</p></div>)}</div></div>}
  </section>;
}

function PlayTogether({ dashboard, isLoading, onAddFriend, onChallenge, onQuickPlay }: { dashboard: CommunityDashboard; isLoading: boolean; onAddFriend: (query: string) => Promise<boolean>; onChallenge: () => void; onQuickPlay: () => void; }) {
  const [query, setQuery] = useState(""); async function submit(event: FormEvent) { event.preventDefault(); if (await onAddFriend(query)) setQuery(""); }
  return <section className="rounded-2xl border border-blue-900/60 bg-gradient-to-br from-blue-950/25 to-gray-900 p-4 sm:p-5" aria-labelledby="play-together-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-300">Défis & parties</p><h2 id="play-together-title" className="mt-1 text-lg font-black text-white">Jouer ensemble</h2></div><button type="button" onClick={onQuickPlay} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-black text-white">Trouver un adversaire</button></div>
    {dashboard.clanMembers.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-500">Les membres de ton futur clan apparaîtront ici avec un bouton pour lancer un vrai défi amical.</p> : <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{dashboard.clanMembers.map((member) => <ClanMemberCard key={member.publicId} member={member} onChallenge={onChallenge} />)}</div>}
    <details className="mt-4 rounded-xl border border-gray-800 bg-gray-950/40"><summary className="cursor-pointer list-none p-3 text-sm font-bold text-gray-300">Ajouter à mon cercle d’amis</summary><form onSubmit={(event) => void submit(event)} className="flex gap-2 border-t border-gray-800 p-3"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pseudo exact" className="min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white" /><button type="submit" disabled={isLoading || query.trim().length < 2} className="rounded-xl border border-blue-700 px-4 text-sm font-black text-blue-200 disabled:opacity-50">Ajouter</button></form></details>
  </section>;
}

function ClanMemberCard({ member, onChallenge }: { member: CommunityClanMember; onChallenge: () => void }) {
  const avatar = getCommunityAvatar(member.avatarId);
  return <article className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-950/55 p-3"><Image src={avatar.image} alt="" width={48} height={48} className="h-11 w-11 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{member.name}{member.isOwner ? " ♛" : ""}</p><p className="text-xs text-blue-300">{member.rating} Elo{member.noxRankLabel ? ` · Nox ${member.noxRankLabel}` : ""}</p><p className="mt-0.5 truncate text-[11px] text-gray-500">{member.activityLabel}</p></div>{!member.isCurrentPlayer && <button type="button" onClick={onChallenge} className="min-h-10 rounded-lg border border-blue-700 px-3 text-xs font-black text-blue-200">Défier</button>}</article>;
}
