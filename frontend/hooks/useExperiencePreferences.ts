"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  DEFAULT_EXPERIENCE_PREFERENCES,
  EXPERIENCE_PREFERENCES_EVENT,
  readExperiencePreferences,
  type ExperiencePreferences,
} from "@/lib/preferences/experience";

export function useExperiencePreferences() {
  const [preferences, setPreferences] =
    useState<ExperiencePreferences>(
      DEFAULT_EXPERIENCE_PREFERENCES,
    );

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setPreferences(
          readExperiencePreferences(),
        ),
      0,
    );
    const handleChange = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<ExperiencePreferences>;
      setPreferences(
        customEvent.detail ??
          readExperiencePreferences(),
      );
    };
    window.addEventListener(
      EXPERIENCE_PREFERENCES_EVENT,
      handleChange,
    );

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(
        EXPERIENCE_PREFERENCES_EVENT,
        handleChange,
      );
    };
  }, []);

  return preferences;
}
