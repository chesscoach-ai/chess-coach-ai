"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import { getReminderMessage } from "@/lib/content/playfulVoice";
import {
  buildJourneyLedger,
  getJourneySummary,
  JOURNEY_STORAGE_KEY,
  type JourneyDashboard,
  type JourneyFriendQuest,
  type JourneyLeaderboardEntry,
  type JourneyLedger,
  type JourneyTaskId,
} from "@/lib/progression/journey";
import {
  getTrainingActivity,
} from "@/lib/pgnExerciseProgress";

const TASKS: Array<{
  id: JourneyTaskId;
  title: string;
  detail: string;
  xp: number;
}> = [
  {
    id: "play",
    title: "Joue une partie",
    detail: "Match en ligne terminé",
    xp: 20,
  },
  {
    id: "exercise",
    title: "Résous un exercice",
    detail: "Une position bien comprise",
    xp: 15,
  },
  {
    id: "review",
    title: "Tire une leçon",
    detail: "Bilan d’une partie calculé",
    xp: 25,
  },
];

export default function DailyJourneyHub({
  currentUser,
  mode,
  onPlay,
  onCoach,
}: {
  currentUser: CurrentUser | null;
  mode: "analysis" | "multiplayer";
  onPlay: () => void;
  onCoach: () => void;
}) {
  const [ledger, setLedger] =
    useState<JourneyLedger>({});
  const [isLoading, setIsLoading] =
    useState(true);
  const [leaderboard, setLeaderboard] =
    useState<
      JourneyLeaderboardEntry[]
    >([]);
  const [syncState, setSyncState] =
    useState<
      "local" | "synced" | "error"
    >("local");
  const [friendQuest, setFriendQuest] =
    useState<JourneyFriendQuest | null>(
      null,
    );
  const [streakFreezes, setStreakFreezes] =
    useState(0);
  const [
    lastProtectedDate,
    setLastProtectedDate,
  ] = useState<string | null>(null);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadProgress() {
      const existing =
        readStoredLedger();
      let next = buildJourneyLedger(
        [],
        getTrainingActivity(35),
        existing,
      );

      if (currentUser) {
        try {
          const response = await fetch(
            "/api/progression",
            {
              method: "PUT",
              cache: "no-store",
              signal: controller.signal,
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                ledger: next,
              }),
            },
          );
          const payload =
            (await response.json()) as {
              dashboard?: JourneyDashboard;
            };
          if (
            response.ok &&
            payload.dashboard
          ) {
            next =
              payload.dashboard.ledger;
            setLeaderboard(
              payload.dashboard
                .leaderboard,
            );
            setFriendQuest(
              payload.dashboard
                .friendQuest,
            );
            setStreakFreezes(
              payload.dashboard
                .streakFreezes,
            );
            setLastProtectedDate(
              payload.dashboard
                .lastProtectedDate,
            );
            setSyncState("synced");
          } else {
            setSyncState("error");
          }
        } catch {
          if (controller.signal.aborted) {
            return;
          }
          setSyncState("error");
        }
      }

      window.localStorage.setItem(
        JOURNEY_STORAGE_KEY,
        JSON.stringify(next),
      );
      setLedger(next);
      setIsLoading(false);
    }

    void loadProgress();
    return () => controller.abort();
  }, [currentUser]);

  const summary = useMemo(
    () => getJourneySummary(ledger),
    [ledger],
  );
  const leagueProgress =
    summary.league.nextAt === null
      ? 100
      : Math.min(
          100,
          Math.round(
            (summary.weeklyXp /
              summary.league.nextAt) *
              100,
          ),
        );

  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-blue-900/60 bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/45 shadow-xl">
      <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[1fr_1.35fr] lg:items-stretch">
        <div className="grid grid-cols-3 gap-2">
          <JourneyMetric
            icon="🔥"
            label="Série"
            value={
              isLoading
                ? "…"
                : currentUser
                  ? `${summary.streak} j · 🛡 ${streakFreezes}`
                  : `${summary.streak} j`
            }
          />
          <JourneyMetric
            icon="⚡"
            label="Cette semaine"
            value={`${summary.weeklyXp} XP`}
          />
          <JourneyMetric
            icon="🏆"
            label="Ligue"
            value={summary.league.name.replace(
              "Ligue ",
              "",
            )}
            accent={summary.league.color}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={
              mode === "multiplayer"
            }
            onClick={onPlay}
            className={`group min-h-28 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-4 text-left text-white shadow-lg shadow-blue-950/40 transition hover:from-blue-400 hover:to-blue-600 active:scale-[0.98] ${
              mode === "multiplayer"
                ? "ring-2 ring-white/80 ring-offset-2 ring-offset-gray-950"
                : ""
            }`}
          >
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-100">
              <span className="text-xl" aria-hidden="true">
                ♞
              </span>
              Multijoueur
            </span>
            <span className="mt-2 block text-sm font-black sm:text-base">
              Jouer un match classé
            </span>
            <span className="mt-0.5 block text-[11px] text-blue-100">
              En ligne · adversaire de ton Elo
            </span>
          </button>

          <button
            type="button"
            aria-pressed={
              mode === "analysis"
            }
            onClick={onCoach}
            className={`group min-h-28 rounded-2xl border border-violet-700/70 bg-violet-950/45 p-4 text-left text-white transition hover:border-violet-500 hover:bg-violet-950/70 active:scale-[0.98] ${
              mode === "analysis"
                ? "ring-2 ring-violet-300 ring-offset-2 ring-offset-gray-950"
                : ""
            }`}
          >
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">
              <span className="text-xl" aria-hidden="true">
                💡
              </span>
              Coach IA
            </span>
            <span className="mt-2 block text-sm font-black sm:text-base">
              Progresser avec le coach
            </span>
            <span className="mt-0.5 block text-[11px] text-violet-200/80">
              Analyse · leçon guidée en 5 min
            </span>
          </button>
        </div>
      </div>

      <details className="group border-t border-gray-800/80">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-300">
                Objectifs du jour
              </p>
              <span className="text-xs font-bold text-gray-400">
                {summary.completedToday}/3 ·{" "}
                {summary.todayXp}/60 XP
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                style={{
                  width: `${(summary.completedToday / 3) * 100}%`,
                }}
              />
            </div>
          </div>
          <span className="text-blue-300 transition group-open:rotate-180">
            ⌄
          </span>
        </summary>

        <div className="grid gap-2 border-t border-gray-800/70 p-3 sm:grid-cols-3">
          {TASKS.map((task) => (
            <QuestRow
              key={task.id}
              {...task}
              complete={
                summary.today.tasks[
                  task.id
                ]
              }
              locked={
                !currentUser &&
                task.id !== "exercise"
              }
            />
          ))}
        </div>

        <p className="border-t border-gray-800/70 px-4 py-3 text-xs leading-5 text-gray-400">
          {summary.completedToday === 3
            ? "Mission accomplie. Les rois du voisinage peuvent dormir tranquilles… pour aujourd’hui."
            : getReminderMessage()}
        </p>

        {currentUser && (
          <div className="flex items-start gap-3 border-t border-gray-800/70 bg-blue-950/15 px-4 py-3 text-xs leading-5">
            <span
              className="text-lg"
              aria-hidden="true"
            >
              🛡️
            </span>
            <div>
              <p className="font-bold text-blue-200">
                {streakFreezes > 0
                  ? `${streakFreezes} bouclier${streakFreezes > 1 ? "s" : ""} de série disponible${streakFreezes > 1 ? "s" : ""}`
                  : "Prochain bouclier en préparation"}
              </p>
              <p className="text-gray-500">
                {lastProtectedDate
                  ? `Dernier sauvetage le ${formatJourneyDate(lastProtectedDate)} : le roi avait posé un RTT, ta série a survécu.`
                  : "Un bouclier protège automatiquement une seule journée manquée. Gagne-en un autre avec 7 journées parfaites."}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-3 border-t border-gray-800/80 px-4 py-3 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-bold ${summary.league.color}`}
              >
                {summary.league.name}
              </span>
              <span className="text-gray-500">
                {summary.league.nextAt
                  ? `${summary.weeklyXp}/${summary.league.nextAt} XP`
                  : "Division maximale"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{
                  width: `${leagueProgress}%`,
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-gray-300">
              Défi mensuel
            </span>
            <span className="font-bold text-violet-300">
              {summary.monthlyQuests}/30 quêtes
            </span>
          </div>
        </div>

        {currentUser &&
          leaderboard.length > 0 && (
            <div className="border-t border-gray-800/80 p-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">
                  Classement de ta ligue
                </p>
                <span className="text-[11px] text-gray-500">
                  Remise à zéro lundi
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {leaderboard
                  .slice(0, 5)
                  .map((entry) => (
                    <div
                      key={
                        entry.playerId
                      }
                      className={[
                        "grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                        entry.currentPlayer
                          ? "border-blue-700 bg-blue-950/35"
                          : "border-gray-800 bg-gray-950/45",
                      ].join(" ")}
                    >
                      <span className="font-black text-gray-500">
                        {entry.rank}
                      </span>
                      <span className="truncate font-bold text-gray-200">
                        {entry.name}
                        {entry.currentPlayer
                          ? " · toi"
                          : ""}
                      </span>
                      <span className="font-black text-amber-300">
                        {
                          entry.weeklyXp
                        }{" "}
                        XP
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

        {currentUser && (
          <div className="border-t border-gray-800/80 p-3">
            {friendQuest ? (
              <div className="rounded-xl border border-violet-800/60 bg-violet-950/25 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-300">
                      Quête en duo
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      Toi +{" "}
                      {
                        friendQuest.friendName
                      }
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {friendQuest.completed
                        ? "Objectif atteint : votre duo a sauvagement maté la procrastination."
                        : "Additionnez vos XP utiles avant lundi."}
                    </p>
                  </div>
                  <span className="shrink-0 text-xl">
                    {friendQuest.completed
                      ? "🏆"
                      : "🤝"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-violet-400"
                      style={{
                        width: `${Math.min(
                          100,
                          (friendQuest.combinedXp /
                            friendQuest.goalXp) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-violet-200">
                    {
                      friendQuest.combinedXp
                    }
                    /
                    {friendQuest.goalXp} XP
                  </span>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-700 px-3 py-3 text-xs leading-5 text-gray-500">
                Ajoute un ami dans la Communauté pour débloquer une quête en
                duo la semaine prochaine.
              </p>
            )}
          </div>
        )}

        <div className="border-t border-gray-800/80 px-4 py-3 text-center">
          <Link
            href="/exercises?placement=1"
            className="text-xs font-bold text-blue-300 transition hover:text-blue-200"
          >
            🧭 Ajuster la difficulté avec le diagnostic de 4 minutes
          </Link>
        </div>
      </details>

      {!currentUser && (
        <div className="border-t border-blue-900/40 bg-blue-950/20 px-4 py-2 text-center text-xs text-gray-400">
          <Link
            href="/auth"
            className="font-bold text-blue-300"
          >
            Crée ton compte
          </Link>{" "}
          pour synchroniser ta progression.
        </div>
      )}
      {currentUser && (
        <p
          className={[
            "border-t px-4 py-2 text-center text-[11px]",
            syncState === "synced"
              ? "border-emerald-900/40 bg-emerald-950/15 text-emerald-300"
              : syncState === "error"
                ? "border-amber-900/40 bg-amber-950/15 text-amber-300"
                : "border-gray-800 text-gray-500",
          ].join(" ")}
        >
          {syncState === "synced"
            ? "✓ Progression synchronisée sur ton compte"
            : syncState === "error"
              ? "Progression conservée sur cet appareil · nouvelle tentative au prochain passage"
              : "Synchronisation en cours…"}
        </p>
      )}
    </section>
  );
}

function JourneyMetric({
  icon,
  label,
  value,
  accent = "text-white",
}: {
  icon: string;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-800 bg-gray-950/55 px-2 py-2.5 text-center">
      <span aria-hidden="true" className="text-base">
        {icon}
      </span>
      <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate text-xs font-black sm:text-sm ${accent}`}
      >
        {value}
      </p>
    </div>
  );
}

function QuestRow({
  title,
  detail,
  xp,
  complete,
  locked,
}: {
  title: string;
  detail: string;
  xp: number;
  complete: boolean;
  locked: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-xl border p-3",
        complete
          ? "border-emerald-800 bg-emerald-950/25"
          : "border-gray-800 bg-gray-950/45",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black",
          complete
            ? "bg-emerald-500 text-white"
            : locked
              ? "bg-gray-800 text-gray-500"
              : "bg-blue-500/15 text-blue-300",
        ].join(" ")}
      >
        {complete ? "✓" : locked ? "🔒" : xp}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-100">
          {title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-gray-500">
          {locked ? "Compte requis" : detail}
        </p>
      </div>
    </div>
  );
}

function readStoredLedger(): JourneyLedger {
  try {
    const raw =
      window.localStorage.getItem(
        JOURNEY_STORAGE_KEY,
      );
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed &&
      typeof parsed === "object"
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function formatJourneyDate(
  dateKey: string,
): string {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "numeric",
      month: "short",
    },
  ).format(
    new Date(`${dateKey}T12:00:00`),
  );
}
