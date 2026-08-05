export type ExperiencePreferences = {
  soundsEnabled: boolean;
  remindersEnabled: boolean;
  reminderTime: string;
  boardVisualMode: "classic" | "medieval";
};

export const EXPERIENCE_PREFERENCES_EVENT =
  "chess-coach:experience-preferences";

const STORAGE_KEY =
  "chess-coach:experience-preferences";

export const DEFAULT_EXPERIENCE_PREFERENCES: ExperiencePreferences =
  {
    soundsEnabled: true,
    remindersEnabled: false,
    reminderTime: "19:00",
    boardVisualMode: "classic",
  };

export function readExperiencePreferences(): ExperiencePreferences {
  if (typeof window === "undefined") {
    return DEFAULT_EXPERIENCE_PREFERENCES;
  }

  try {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY,
      );
    if (!raw) {
      return DEFAULT_EXPERIENCE_PREFERENCES;
    }
    const parsed = JSON.parse(raw) as
      Partial<ExperiencePreferences>;
    return {
      soundsEnabled:
        parsed.soundsEnabled ?? true,
      remindersEnabled:
        parsed.remindersEnabled ?? false,
      reminderTime:
        typeof parsed.reminderTime ===
          "string" &&
        /^\d{2}:\d{2}$/.test(
          parsed.reminderTime,
        )
          ? parsed.reminderTime
          : "19:00",
      boardVisualMode:
        parsed.boardVisualMode ===
        "medieval"
          ? "medieval"
          : "classic",
    };
  } catch {
    return DEFAULT_EXPERIENCE_PREFERENCES;
  }
}

export function saveExperiencePreferences(
  preferences: ExperiencePreferences,
): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(preferences),
  );
  window.dispatchEvent(
    new CustomEvent(
      EXPERIENCE_PREFERENCES_EVENT,
      {
        detail: preferences,
      },
    ),
  );
}
