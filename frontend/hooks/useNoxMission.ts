"use client";
import { useCallback, useEffect, useState } from "react";
import type { NoxMission } from "@/lib/nox/missionTypes";
import { resolvedTimeZone } from "@/lib/nox/dailySessionRules";
import { buildNoxMission } from "@/lib/nox/missionRules";
import { createNoxMemoryProfile } from "@/lib/nox/memoryRules";

const MISSION_CACHE_KEY = "knightly:nox-mission-cache:v1";

export function useNoxMission() {
  const [mission, setMission] = useState<NoxMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => { setLoading(true); setError(""); if (isRitualPreview()) { setMission({ ...buildNoxMission({ profile: createNoxMemoryProfile(), events: [], timeZone: resolvedTimeZone() }), preview: true, persistent: false }); setLoading(false); return; } try { const response = await fetch(`/api/nox/missions?timeZone=${encodeURIComponent(resolvedTimeZone())}`, { cache: "no-store" }); if (!response.ok) throw new Error("SESSION_BACKEND_UNAVAILABLE"); const loaded = applyDevelopmentPreview(await response.json() as NoxMission); window.localStorage.setItem(MISSION_CACHE_KEY, JSON.stringify(loaded)); setMission(loaded); } catch { setError("Connexion momentanément indisponible. Ta progression locale est conservée."); const cached = readCachedMission(); setMission(cached ?? buildNoxMission({ profile: createNoxMemoryProfile(), events: [], timeZone: resolvedTimeZone() })); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);
  return { mission, loading, error, refresh, setMission };
}

function isRitualPreview(): boolean {
  return process.env.NODE_ENV !== "production" && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ritualPreview");
}

function readCachedMission(): NoxMission | null {
  try { return JSON.parse(window.localStorage.getItem(MISSION_CACHE_KEY) ?? "null") as NoxMission | null; }
  catch { return null; }
}

function applyDevelopmentPreview(mission: NoxMission): NoxMission {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return mission;
  const preview = new URLSearchParams(window.location.search).get("dailySessionPreview") ?? new URLSearchParams(window.location.search).get("missionPreview");
  if (preview === "new") return { ...mission, preview: true, persistent: false, status: "offered", currentStep: 0, startedAt: null, completedAt: null, results: [], reasonCode: "guided_discovery", reason: "Mission découverte : quelques positions pour commencer à comprendre ton jeu.", confidence: "low", difficulty: "discovery" };
  if (preview === "weakness") return { ...mission, preview: true, persistent: true, conceptId: "king_safety", conceptLabel: "mettre ton roi en sécurité", title: "Mission : Mettre ton roi en sécurité", reasonCode: "weakness_confirmed", reason: "J’ai remarqué qu’on doit encore travailler à mettre ton roi en sécurité. Je t’ai préparé quelques positions.", confidence: "high", difficulty: "discovery", status: "offered", currentStep: 0, results: [] };
  if (preview === "spaced") return { ...mission, preview: true, persistent: true, reasonCode: "spaced_review", reason: "Cela fait un moment : vérifions que nous savons toujours repérer ce thème.", difficulty: "mastery", status: "offered", currentStep: 0, results: [] };
  if (preview === "consolidation") return { ...mission, preview: true, persistent: true, reasonCode: "improvement_consolidation", reason: "On progresse déjà sur ce thème. Cette courte session va consolider ce nouveau réflexe.", difficulty: "consolidation", status: "offered", currentStep: 0, results: [] };
  if (preview === "in-progress") return { ...mission, preview: true, persistent: true, status: "started", currentStep: 1, startedAt: new Date().toISOString(), results: mission.exerciseIds.slice(0, 1).map((exerciseId) => ({ exerciseId, success: true, mistakes: 0, hintsUsed: 0, completedAt: new Date().toISOString() })) };
  if (preview === "completed") return { ...mission, preview: true, persistent: true, status: "completed", currentStep: mission.exerciseIds.length, completedAt: new Date().toISOString(), results: mission.exerciseIds.map((exerciseId) => ({ exerciseId, success: true, mistakes: 0, hintsUsed: 0, completedAt: new Date().toISOString() })) };
  return mission;
}
