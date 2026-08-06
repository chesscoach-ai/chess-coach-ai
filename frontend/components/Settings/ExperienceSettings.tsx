"use client";

import {
  useEffect,
  useState,
} from "react";

import { useExperiencePreferences } from "@/hooks/useExperiencePreferences";
import { getReminderMessage } from "@/lib/content/playfulVoice";
import {
  readExperiencePreferences,
  saveExperiencePreferences,
} from "@/lib/preferences/experience";
import {
  disableNativePushToken,
  isNativeApp,
  requestNativePushRegistration,
} from "@/lib/mobile/platform";
import {
  getJourneySummary,
  JOURNEY_STORAGE_KEY,
  type JourneyLedger,
} from "@/lib/progression/journey";

const LAST_REMINDER_KEY =
  "chess-coach:last-local-reminder";

export default function ExperienceSettings({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const preferences =
    useExperiencePreferences();
  // Capacitor n'existe que dans la WebView. Garder la même valeur pendant le
  // rendu serveur et la première hydratation évite un arbre React différent.
  const [nativeApp, setNativeApp] =
    useState(false);
  const [notice, setNotice] =
    useState("");
  const [isNotificationSupported, setIsNotificationSupported] =
    useState(false);
  const [
    isServerPushAvailable,
    setIsServerPushAvailable,
  ] = useState(false);
  const [
    isServerSubscribed,
    setIsServerSubscribed,
  ] = useState(false);
  const [isPushBusy, setIsPushBusy] =
    useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setNativeApp(isNativeApp()),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function inspectPush() {
      try {
        const [registration, response] =
          await Promise.all([
            navigator.serviceWorker.register(
              "/sw.js",
              {
                scope: "/",
                updateViaCache: "none",
              },
            ),
            fetch("/api/push/config", {
              cache: "no-store",
            }),
          ]);
        const config =
          (await response.json()) as {
            configured?: boolean;
          };
        const subscription =
          await registration.pushManager.getSubscription();
        if (
          subscription &&
          !isAuthenticated
        ) {
          await subscription.unsubscribe();
        }
        if (!cancelled) {
          setIsServerPushAvailable(
            Boolean(
              response.ok &&
                config.configured,
            ),
          );
          setIsServerSubscribed(
            Boolean(
              subscription &&
                isAuthenticated,
            ),
          );
        }
      } catch {
        if (!cancelled) {
          setIsServerPushAvailable(
            false,
          );
        }
      }
    }
    const timer = window.setTimeout(
      () => {
        const supported =
          nativeApp ||
          ("Notification" in window &&
            "serviceWorker" in
              navigator &&
            "PushManager" in window);
        setIsNotificationSupported(
          supported,
        );
        if (nativeApp) {
          setIsServerPushAvailable(isAuthenticated);
          setIsServerSubscribed(
            isAuthenticated && preferences.remindersEnabled,
          );
        } else if (supported) {
          void inspectPush();
        }
      },
      0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isAuthenticated, nativeApp, preferences.remindersEnabled]);

  useEffect(() => {
    if (
      nativeApp ||
      !preferences.remindersEnabled ||
      !isNotificationSupported ||
      isServerSubscribed ||
      Notification.permission !==
        "granted"
    ) {
      return;
    }

    void navigator.serviceWorker.register(
      "/sw.js",
      {
        scope: "/",
        updateViaCache: "none",
      },
    );
    const checkReminder = () => {
      void showReminderIfDue(
        preferences.reminderTime,
      );
    };
    checkReminder();
    const interval = window.setInterval(
      checkReminder,
      60_000,
    );
    return () =>
      window.clearInterval(interval);
  }, [
    isNotificationSupported,
    isServerSubscribed,
    preferences.reminderTime,
    preferences.remindersEnabled,
    nativeApp,
  ]);

  function updateSound(
    enabled: boolean,
  ): void {
    saveExperiencePreferences({
      ...readExperiencePreferences(),
      soundsEnabled: enabled,
    });
    setNotice(
      enabled
        ? "Les pièces ont retrouvé leur voix."
        : "Mode ninja activé : les pièces avancent en silence.",
    );
  }

  function updateHaptics(enabled: boolean): void {
    saveExperiencePreferences({
      ...readExperiencePreferences(),
      hapticsEnabled: enabled,
    });
    setNotice(
      enabled
        ? "Vibrations activées : chaque capture aura un peu plus de mordant."
        : "Vibrations coupées. Tes cavaliers avanceront sur la pointe des sabots.",
    );
  }

  async function updateReminders(
    enabled: boolean,
  ): Promise<void> {
    if (nativeApp) {
      setIsPushBusy(true);
      try {
        if (!enabled) {
          await disableNativePushToken();
          saveExperiencePreferences({
            ...readExperiencePreferences(),
            remindersEnabled: false,
          });
          setIsServerSubscribed(false);
          setNotice("Rappels désactivés. Le coach range son pigeon messager.");
          return;
        }
        if (!isAuthenticated) {
          setNotice("Connecte-toi avant d’activer les rappels sur ce téléphone.");
          return;
        }
        const registered = await requestNativePushRegistration();
        if (!registered) {
          setNotice("Permission refusée : aucun rappel ne quittera le château.");
          return;
        }
        saveExperiencePreferences({
          ...readExperiencePreferences(),
          remindersEnabled: true,
        });
        setIsServerSubscribed(true);
        setNotice("Rappels mobiles activés. Le coach surveille ta série.");
      } catch {
        setNotice("Impossible d’activer les rappels sur cet appareil.");
      } finally {
        setIsPushBusy(false);
      }
      return;
    }

    if (!enabled) {
      setIsPushBusy(true);
      try {
        const registration =
          await navigator
            .serviceWorker.ready;
        const subscription =
          await registration.pushManager.getSubscription();
        if (subscription) {
          await fetch(
            "/api/push/subscriptions",
            {
              method: "DELETE",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                endpoint:
                  subscription.endpoint,
              }),
            },
          );
          await subscription.unsubscribe();
        }
        setIsServerSubscribed(false);
      } catch {
        // La préférence locale est quand même respectée.
      } finally {
        setIsPushBusy(false);
      }
      saveExperiencePreferences({
        ...readExperiencePreferences(),
        remindersEnabled: false,
      });
      setNotice(
        "Rappels désactivés. Ton roi ne dira rien, mais il jugera un peu.",
      );
      return;
    }

    if (!isNotificationSupported) {
      setNotice(
        "Ce navigateur ne prend pas encore les rappels en charge.",
      );
      return;
    }

    const permission =
      await Notification.requestPermission();
    if (permission !== "granted") {
      setNotice(
        "Permission refusée : aucun pigeon messager ne sera envoyé.",
      );
      return;
    }

    setIsPushBusy(true);
    try {
      const registration =
        await navigator.serviceWorker.register(
          "/sw.js",
          {
            scope: "/",
            updateViaCache: "none",
          },
        );
      if (
        isServerPushAvailable &&
        isAuthenticated
      ) {
        const configResponse =
          await fetch(
            "/api/push/config",
            { cache: "no-store" },
          );
        const config =
          (await configResponse.json()) as {
            publicKey?: string | null;
          };
        if (!config.publicKey) {
          throw new Error(
            "Clé Push absente.",
          );
        }
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe(
            {
              userVisibleOnly: true,
              applicationServerKey:
                urlBase64ToUint8Array(
                  config.publicKey,
                ),
            },
          ));
        const response =
          await saveServerSubscription(
            subscription,
            preferences.reminderTime,
          );
        if (!response.ok) {
          const payload =
            (await response.json()) as {
              message?: string;
            };
          await subscription.unsubscribe();
          throw new Error(
            payload.message ??
              "Abonnement impossible.",
          );
        }
        setIsServerSubscribed(true);
      }
      saveExperiencePreferences({
        ...readExperiencePreferences(),
        remindersEnabled: true,
      });
      setNotice(
        isServerPushAvailable &&
          isAuthenticated
          ? "Rappel mobile activé. Même application fermée, le coach garde un œil royal sur ta série."
          : isServerPushAvailable
            ? "Rappel local activé. Connecte-toi pour le recevoir même application fermée."
            : "Rappel local activé. Il fonctionne tant que la PWA reste active.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Impossible d’activer les rappels.",
      );
    } finally {
      setIsPushBusy(false);
    }
  }

  function updateReminderTime(
    value: string,
  ): void {
    saveExperiencePreferences({
      ...readExperiencePreferences(),
      reminderTime: value,
    });
    if (isServerSubscribed && !nativeApp) {
      void syncReminderTime(value);
    }
  }

  async function syncReminderTime(
    value: string,
  ): Promise<void> {
    try {
      const registration =
        await navigator.serviceWorker.ready;
      const subscription =
        await registration.pushManager.getSubscription();
      if (!subscription) return;
      const response =
        await saveServerSubscription(
          subscription,
          value,
        );
      if (response.ok) {
        setNotice(
          `Rappel déplacé à ${value}. Le coach a réglé son réveil.`,
        );
      }
    } catch {
      setNotice(
        "L’heure est enregistrée sur cet appareil ; la synchronisation serveur réessaiera plus tard.",
      );
    }
  }

  async function sendTestNotification(): Promise<void> {
    setIsPushBusy(true);
    try {
      const response = await fetch(
        "/api/push/test",
        { method: "POST" },
      );
      const payload =
        (await response.json()) as {
          message?: string;
        };
      setNotice(
        response.ok
          ? "Notification test envoyée. Le pigeon messager approche."
          : payload.message ??
              "Le test n’a pas pu partir.",
      );
    } catch {
      setNotice(
        "Le test n’a pas pu partir. Le pigeon prétend qu’il y avait du vent.",
      );
    } finally {
      setIsPushBusy(false);
    }
  }

  return (
    <details className="group relative">
      <summary
        aria-label="Réglages du son et des rappels"
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-gray-700 bg-gray-900 text-lg text-gray-300 transition hover:border-blue-700 hover:text-white"
      >
        ⚙
      </summary>
      <div className="fixed left-3 right-3 top-16 z-50 w-auto rounded-2xl border border-gray-700 bg-gray-900 p-4 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[min(21rem,calc(100vw-1.5rem))]">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-300">
          Ambiance de jeu
        </p>

        <SettingRow
          icon="🔊"
          title="Bruit des pièces"
          description="Déplacement, capture, échec et mat."
          checked={
            preferences.soundsEnabled
          }
          onChange={updateSound}
        />

        {nativeApp && (
          <SettingRow
            icon="📳"
            title="Vibrations tactiles"
            description="Déplacement, capture et alerte d’échec."
            checked={preferences.hapticsEnabled}
            onChange={updateHaptics}
          />
        )}

        <SettingRow
          icon="🔥"
          title="Rappel quotidien"
          description={
            isNotificationSupported
              ? "Un rappel taquin, jamais une avalanche."
              : "Indisponible sur ce navigateur."
          }
          checked={
            preferences.remindersEnabled
          }
          disabled={
            !isNotificationSupported ||
            isPushBusy
          }
          onChange={(enabled) => {
            void updateReminders(enabled);
          }}
        />

        {preferences.remindersEnabled && (
          <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-950/60 px-3 py-2">
            <span className="text-xs font-semibold text-gray-300">
              Heure du rappel
            </span>
            <input
              type="time"
              value={
                preferences.reminderTime
              }
              onChange={(event) =>
                updateReminderTime(
                  event.target.value,
                )
              }
              className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white"
            />
          </label>
        )}

        <p className="mt-3 text-[11px] leading-5 text-gray-500">
          {isServerSubscribed
            ? "Rappel serveur actif sur cet appareil, même lorsque l’application est fermée."
            : isServerPushAvailable
              ? "Connecte-toi puis active le rappel pour le recevoir même application fermée."
              : "Mode local : le rappel fonctionne lorsque la PWA est active."}
        </p>
        {isServerSubscribed && !nativeApp && (
          <button
            type="button"
            disabled={isPushBusy}
            onClick={() => {
              void sendTestNotification();
            }}
            className="mt-2 w-full rounded-lg border border-blue-800 bg-blue-950/30 px-3 py-2 text-xs font-bold text-blue-200 transition hover:bg-blue-950/55 disabled:opacity-50"
          >
            Envoyer une notification test
          </button>
        )}
        {notice && (
          <p
            role="status"
            className="mt-2 rounded-lg bg-blue-950/35 px-3 py-2 text-xs text-blue-200"
          >
            {notice}
          </p>
        )}
      </div>
    </details>
  );
}

function SettingRow({
  icon,
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  icon: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-950/55 p-3">
      <span
        aria-hidden="true"
        className="text-lg"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-100">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          "relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40",
          checked
            ? "bg-blue-500"
            : "bg-gray-700",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
            checked
              ? "left-6"
              : "left-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

async function saveServerSubscription(
  subscription: PushSubscription,
  reminderTime: string,
): Promise<Response> {
  const serialized =
    subscription.toJSON();
  return fetch(
    "/api/push/subscriptions",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        endpoint:
          subscription.endpoint,
        keys: serialized.keys,
        reminderTime,
        timezone:
          Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone ||
          "Europe/Paris",
      }),
    },
  );
}

function urlBase64ToUint8Array(
  base64String: string,
): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) %
      4,
  );
  const base64 = (
    base64String + padding
  )
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData =
    window.atob(base64);
  const output =
    new Uint8Array(rawData.length);
  for (
    let index = 0;
    index < rawData.length;
    index += 1
  ) {
    output[index] =
      rawData.charCodeAt(index);
  }
  return output;
}

async function showReminderIfDue(
  reminderTime: string,
): Promise<void> {
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(
      now.getMonth() + 1,
    ).padStart(2, "0"),
    String(now.getDate()).padStart(
      2,
      "0",
    ),
  ].join("-");
  const currentTime = `${String(
    now.getHours(),
  ).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;

  if (
    currentTime < reminderTime ||
    window.localStorage.getItem(
      LAST_REMINDER_KEY,
    ) === today
  ) {
    return;
  }

  let ledger: JourneyLedger = {};
  try {
    ledger = JSON.parse(
      window.localStorage.getItem(
        JOURNEY_STORAGE_KEY,
      ) ?? "{}",
    ) as JourneyLedger;
  } catch {
    ledger = {};
  }
  if (
    getJourneySummary(ledger, now)
      .completedToday >= 3
  ) {
    return;
  }

  const registration =
    await navigator.serviceWorker.ready;
  await registration.showNotification(
    "Chess Clan · Ta mission t’attend",
    {
      body: getReminderMessage(now),
      icon: "/favicon.ico",
      tag: `daily-coach-${today}`,
    },
  );
  window.localStorage.setItem(
    LAST_REMINDER_KEY,
    today,
  );
}
