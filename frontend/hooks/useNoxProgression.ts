"use client";

import { useCallback, useEffect, useState } from "react";
import { applyNoxRankPreview } from "@/lib/nox/progressionRules";
import type { NoxProgressionSnapshot, NoxRankId } from "@/lib/nox/progressionTypes";

export const NOX_PREVIEW_STORAGE_KEY = "knightly:nox-preview-rank";

export function useNoxProgression() {
  const [progression, setProgression] = useState<NoxProgressionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/nox/progression", { cache: "no-store" });
      if (!response.ok) return;
      let next = (await response.json()) as NoxProgressionSnapshot;
      if (process.env.NODE_ENV !== "production") {
        next = applyNoxRankPreview(next, window.localStorage.getItem(NOX_PREVIEW_STORAGE_KEY) as NoxRankId | null, process.env.NODE_ENV);
      }
      setProgression(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  return { progression, loading, refresh };
}
