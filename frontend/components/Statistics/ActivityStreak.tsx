"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import type { OnlinePlayerStatistics } from "@/lib/multiplayer/types";

export default function ActivityStreak({
  currentUser,
}: {
  currentUser: CurrentUser | null;
}) {
  const [statistics, setStatistics] =
    useState<OnlinePlayerStatistics | null>(
      null,
    );

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const controller =
      new AbortController();

    void fetch(
      "/api/multiplayer/statistics",
      {
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) return;
        const payload =
          (await response.json()) as {
            statistics:
              OnlinePlayerStatistics;
          };
        setStatistics(
          payload.statistics,
        );
      })
      .catch(() => {
        // Une annulation au changement de page est normale.
      });

    return () => controller.abort();
  }, [currentUser]);

  const days = useMemo(
    () => buildRecentDays(),
    [],
  );
  const activeDates = new Set(
    statistics?.activityDates ?? [],
  );
  const streak =
    statistics?.currentStreak ?? 0;

  return (
    <section className="mx-auto mb-3 flex w-full max-w-2xl flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-900/60 bg-gradient-to-r from-blue-950/45 to-gray-900 px-3 py-2 shadow-lg sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.16)] sm:h-11 sm:w-11 sm:rounded-xl">
          <FlameIcon />
        </span>
        <div>
          <p className="text-sm font-black text-white">
            {currentUser
              ? `Série de ${streak} jour${streak > 1 ? "s" : ""}`
              : "Ta série de jeu"}
          </p>
          <p className="mt-0.5 hidden text-xs text-gray-400 sm:block">
            {currentUser
              ? streak > 0
                ? "Continue aujourd’hui pour entretenir la flamme."
                : "Termine une partie aujourd’hui pour allumer la flamme."
              : "Connecte-toi pour suivre tes jours de jeu."}
          </p>
        </div>
      </div>

      <div className="order-3 flex w-full items-end justify-between gap-1 border-t border-blue-900/40 pt-2 sm:order-none sm:w-auto sm:border-0 sm:pt-0">
        {days.map((day) => {
          const active =
            activeDates.has(day.key);
          return (
            <div
              key={day.key}
              className="text-center"
              title={day.longLabel}
            >
              <span className="block text-[10px] font-bold uppercase text-gray-500">
                {day.shortLabel}
              </span>
              <span
                className={[
                "mt-1 flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-black transition sm:h-7 sm:w-7 sm:text-xs",
                  active
                    ? "border-blue-400 bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.35)]"
                    : day.isToday
                      ? "border-blue-700 bg-blue-950/50 text-blue-300"
                      : "border-gray-700 bg-gray-950/50 text-gray-600",
                ].join(" ")}
              >
                {active
                  ? "✓"
                  : day.isToday
                    ? "•"
                    : ""}
              </span>
            </div>
          );
        })}
      </div>

      {!currentUser && (
        <Link
          href="/auth"
          className="text-xs font-bold text-blue-300 hover:text-blue-200"
        >
          Se connecter
        </Link>
      )}
    </section>
  );
}

function FlameIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-7 w-7"
      fill="currentColor"
    >
      <path d="M13.4 2.2c.5 3.1-1.1 4.5-2.5 5.9-1.2 1.2-2.4 2.4-2.4 4.6 0 1.1.4 2.1 1.1 2.8-.1-2.1 1-3.4 2.2-4.6.5-.5 1-1 1.4-1.6 2.6 1.7 4.3 4.4 4.3 7.1A5.5 5.5 0 0 1 12 22a7.5 7.5 0 0 1-7.5-7.5c0-3.9 2.3-6.1 4.4-8.1 1.7-1.6 3.2-3 3.5-5.1l1 .9Z" />
    </svg>
  );
}

function buildRecentDays(): Array<{
  key: string;
  shortLabel: string;
  longLabel: string;
  isToday: boolean;
}> {
  const formatter =
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      weekday: "short",
    });
  const longFormatter =
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  return Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date();
      date.setDate(
        date.getDate() - (6 - index),
      );
      return {
        key: getParisDateKey(date),
        shortLabel: formatter
          .format(date)
          .slice(0, 1),
        longLabel:
          longFormatter.format(date),
        isToday: index === 6,
      };
    },
  );
}

function getParisDateKey(
  date: Date,
): string {
  const parts =
    new Intl.DateTimeFormat("fr-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}
