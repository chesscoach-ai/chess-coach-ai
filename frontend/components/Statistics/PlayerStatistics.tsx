"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import type { LearningProfile } from "@/lib/learning/types";
import type {
  GameSpeed,
  OnlinePlayerStatistics,
} from "@/lib/multiplayer/types";

type StatisticsVariant =
  | "analysis"
  | "multiplayer";

export default function PlayerStatistics({
  currentUser,
  variant,
  refreshKey = 0,
}: {
  currentUser: CurrentUser | null;
  variant: StatisticsVariant;
  refreshKey?: number | string;
}) {
  const [statistics, setStatistics] =
    useState<OnlinePlayerStatistics | null>(
      null,
    );
  const [profile, setProfile] =
    useState<LearningProfile | null>(
      null,
    );
  const [isLoading, setIsLoading] =
    useState(Boolean(currentUser));
  const [loadError, setLoadError] =
    useState("");

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const controller =
      new AbortController();
    const requests: Promise<void>[] = [
      fetch(
        "/api/multiplayer/statistics",
        {
          cache: "no-store",
          signal: controller.signal,
        },
      ).then(async (response) => {
        if (!response.ok) {
          throw new Error(
            "Les statistiques multijoueur sont momentanément indisponibles.",
          );
        }
        const payload =
          (await response.json()) as {
            statistics:
              OnlinePlayerStatistics;
          };
        setStatistics(
          payload.statistics,
        );
      }),
    ];

    if (variant === "analysis") {
      requests.push(
        fetch("/api/learning/profile", {
          cache: "no-store",
          signal: controller.signal,
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(
              "Le profil pédagogique est momentanément indisponible.",
            );
          }
          const payload =
            (await response.json()) as {
              profile: LearningProfile;
            };
          setProfile(payload.profile);
        }),
      );
    }

    void Promise.all(requests)
      .then(() => {
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Les statistiques sont momentanément indisponibles.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    currentUser,
    refreshKey,
    variant,
  ]);

  if (variant === "multiplayer") {
    return (
      <CompactStatistics
        currentUser={currentUser}
        games={statistics?.games ?? 0}
        isLoading={isLoading}
        error={loadError}
      />
    );
  }

  return (
    <AdvancedStatistics
      currentUser={currentUser}
      statistics={statistics}
      profile={profile}
      isLoading={isLoading}
      error={loadError}
    />
  );
}

function CompactStatistics({
  currentUser,
  games,
  isLoading,
  error,
}: {
  currentUser: CurrentUser | null;
  games: number;
  isLoading: boolean;
  error: string;
}) {
  return (
    <section
      id="statistics"
      className="scroll-mt-24 rounded-xl border border-gray-800 bg-gray-900/80 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-400">
            Statistiques
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {error ||
              "Parties classées terminées"}
          </p>
        </div>
        <p className="text-2xl font-black text-white">
          {!currentUser
            ? "—"
            : isLoading
              ? "…"
              : games}
        </p>
      </div>
    </section>
  );
}

function AdvancedStatistics({
  currentUser,
  statistics,
  profile,
  isLoading,
  error,
}: {
  currentUser: CurrentUser | null;
  statistics: OnlinePlayerStatistics | null;
  profile: LearningProfile | null;
  isLoading: boolean;
  error: string;
}) {
  const winRate = statistics?.games
    ? Math.round(
        (statistics.wins /
          statistics.games) *
          100,
      )
    : 0;
  const bestTheme = useMemo(
    () =>
      profile
        ? Object.entries(
            profile.themeOccurrences,
          ).sort(
            ([, first], [, second]) =>
              second - first,
          )[0]
        : null,
    [profile],
  );

  return (
    <section
      id="statistics"
      className="scroll-mt-24 rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-lg sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-400">
            Mes statistiques
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">
            Progression et qualité de jeu
          </h2>
        </div>
        {statistics && (
          <span className="rounded-full border border-blue-800 bg-blue-950/40 px-3 py-1 text-xs font-bold text-blue-200">
            {statistics.currentRating} Elo
          </span>
        )}
      </div>

      {!currentUser ? (
        <p className="mt-4 text-sm text-gray-400">
          <Link
            href="/auth"
            className="font-semibold text-blue-300 hover:text-blue-200"
          >
            Connecte-toi
          </Link>{" "}
          pour suivre tes parties et ta progression.
        </p>
      ) : error && !statistics ? (
        <p
          role="alert"
          className="mt-4 text-sm text-amber-300"
        >
          {error}
        </p>
      ) : isLoading && !statistics ? (
        <p className="mt-4 text-sm text-gray-400">
          Calcul des statistiques…
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric
              label="Parties"
              value={String(
                statistics?.games ?? 0,
              )}
            />
            <Metric
              label="V / N / D"
              value={
                statistics
                  ? `${statistics.wins} / ${statistics.draws} / ${statistics.losses}`
                  : "0 / 0 / 0"
              }
              accent="text-emerald-300"
            />
            <Metric
              label="Taux de victoire"
              value={`${winRate} %`}
            />
            <Metric
              label="Précision moyenne"
              value={
                statistics?.averageAccuracy !=
                null
                  ? `${statistics.averageAccuracy} %`
                  : "À calculer"
              }
            />
          </div>

          <details className="group mt-3 rounded-xl border border-gray-800 bg-gray-950/45">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-gray-200">
              Voir les statistiques avancées
              <span className="text-blue-300 transition group-open:rotate-180">
                ⌄
              </span>
            </summary>
            <div className="grid gap-4 border-t border-gray-800 p-4 lg:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Classement
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Metric
                    label="Plus haut"
                    value={String(
                      statistics?.peakRating ??
                        1200,
                    )}
                  />
                  <Metric
                    label="Évolution"
                    value={formatSigned(
                      statistics?.ratingChange ??
                        0,
                    )}
                    accent={
                      (statistics?.ratingChange ??
                        0) >= 0
                        ? "text-emerald-300"
                        : "text-red-300"
                    }
                  />
                </div>
                <div className="mt-3 space-y-2">
                  {(
                    [
                      "rapid",
                      "blitz",
                      "bullet",
                    ] as GameSpeed[]
                  ).map((speed) => (
                    <SpeedRow
                      key={speed}
                      speed={speed}
                      statistics={
                        statistics?.bySpeed[
                          speed
                        ]
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Analyse du coach
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Metric
                    label="Parties analysées"
                    value={String(
                      profile?.sessionsCount ??
                        0,
                    )}
                  />
                  <Metric
                    label="Coups étudiés"
                    value={String(
                      profile?.analyzedMoves ??
                        0,
                    )}
                  />
                  <Metric
                    label="Coups solides"
                    value={String(
                      (profile?.classifications
                        .excellent ?? 0) +
                        (profile
                          ?.classifications.good ??
                          0),
                    )}
                    accent="text-emerald-300"
                  />
                  <Metric
                    label="Erreurs / gaffes"
                    value={`${profile?.classifications.mistake ?? 0} / ${profile?.classifications.blunder ?? 0}`}
                    accent="text-amber-300"
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-gray-400">
                  Priorité actuelle :{" "}
                  <strong className="text-gray-200">
                    {profile
                      ?.primaryWeaknessLabel ??
                      labelTheme(
                        bestTheme?.[0],
                      ) ??
                      "analyse une première partie"}
                  </strong>
                  . Perte moyenne :{" "}
                  {profile?.averageEvaluationLoss ??
                    0}{" "}
                  pion par coup analysé.
                </p>
              </div>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  accent = "text-white",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p
        className={`mt-1 text-base font-black ${accent}`}
      >
        {value}
      </p>
    </div>
  );
}

function SpeedRow({
  speed,
  statistics,
}: {
  speed: GameSpeed;
  statistics:
    | OnlinePlayerStatistics["bySpeed"][GameSpeed]
    | undefined;
}) {
  const labels: Record<GameSpeed, string> = {
    rapid: "Rapide",
    blitz: "Blitz",
    bullet: "Bullet",
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-800 px-3 py-2 text-sm">
      <span className="font-semibold text-gray-300">
        {labels[speed]}
      </span>
      <span className="text-gray-500">
        {statistics?.games ?? 0} parties ·{" "}
        <strong className="text-gray-300">
          {statistics?.wins ?? 0}/
          {statistics?.draws ?? 0}/
          {statistics?.losses ?? 0}
        </strong>
      </span>
    </div>
  );
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function labelTheme(
  theme: string | undefined,
): string | null {
  const labels: Record<string, string> = {
    opening: "ouvertures",
    tactics: "tactique",
    material: "gestion du matériel",
    calculation: "calcul",
    positional: "jeu positionnel",
    endgame: "finales",
  };
  return theme ? labels[theme] ?? null : null;
}
