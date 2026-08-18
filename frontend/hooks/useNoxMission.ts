"use client";
import { useCallback, useEffect, useState } from "react";
import type { NoxMission } from "@/lib/nox/missionTypes";

export function useNoxMission() {
  const [mission, setMission] = useState<NoxMission | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { setLoading(true); try { const response = await fetch("/api/nox/missions", { cache: "no-store" }); if (response.ok) { const loaded = await response.json() as NoxMission; setMission(applyDevelopmentPreview(loaded)); } } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);
  return { mission, loading, refresh, setMission };
}

function applyDevelopmentPreview(mission: NoxMission): NoxMission {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return mission;
  const preview = new URLSearchParams(window.location.search).get("missionPreview");
  if (preview === "weakness") return { ...mission, preview: true, persistent: true, conceptId: "king_safety", conceptLabel: "mettre ton roi en sécurité", title: "Mission : Mettre ton roi en sécurité", reasonCode: "weakness_confirmed", reason: "J’ai remarqué qu’on doit encore travailler à mettre ton roi en sécurité. Je t’ai préparé quelques positions.", confidence: "high", difficulty: "discovery" };
  if (preview === "completed") return { ...mission, preview: true, persistent: true, status: "completed", currentStep: mission.exerciseIds.length, completedAt: new Date().toISOString(), results: mission.exerciseIds.map((exerciseId) => ({ exerciseId, success: true, mistakes: 0, hintsUsed: 0, completedAt: new Date().toISOString() })) };
  return mission;
}
