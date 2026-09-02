import { describe, expect, it } from "vitest";

import { buildNoxDailySession, explainDailySessionChoice, getLocalSessionDateKey } from "@/lib/nox/dailySessionRules";
import type { NoxMission } from "@/lib/nox/missionTypes";
import type { StoredNoxDailySession } from "@/lib/nox/dailySessionTypes";

function mission(overrides: Partial<NoxMission> = {}): NoxMission {
  return {
    id: "nox:2026-09-02:king_safety", schemaVersion: 1, conceptId: "king_safety", conceptLabel: "mettre ton roi en sécurité",
    title: "Mission : Mettre ton roi en sécurité", reason: "Une raison vérifiée.", reasonCode: "weakness_confirmed", confidence: "high",
    difficulty: "consolidation", estimatedMinutes: 4, exerciseIds: ["a", "b", "c"], quiz: null, status: "offered", currentStep: 0,
    results: [], createdAt: "2026-09-02T08:00:00Z", startedAt: null, completedAt: null, nextEligibleAt: "2026-09-05T08:00:00Z",
    persistent: true, ...overrides,
  };
}

describe("orchestration de la Session du jour", () => {
  it("donne la priorité sémantique à une faiblesse confirmée", () => {
    const session = buildNoxDailySession({ mission: mission(), now: new Date("2026-09-02T10:00:00Z"), timeZone: "Europe/Paris" });
    expect(session).toMatchObject({ type: "weakness", title: "Ta session du jour", status: "offered" });
    expect(explainDailySessionChoice(session)).toContain("plusieurs positions");
  });

  it("présente honnêtement une découverte à l’invité", () => {
    const session = buildNoxDailySession({ mission: mission({ persistent: false, reasonCode: "guided_discovery" }), now: new Date("2026-09-02T10:00:00Z") });
    expect(session.title).toBe("Session découverte");
    expect(session.reason).toContain("apprend encore à te connaître");
    expect(explainDailySessionChoice(session)).toContain("pas encore personnalisée");
  });

  it("estime une durée réelle comprise entre 3 et 7 minutes", () => {
    expect(buildNoxDailySession({ mission: mission({ exerciseIds: ["a"] }) }).estimatedMinutes).toBe(3);
    expect(buildNoxDailySession({ mission: mission({ exerciseIds: ["a", "b", "c", "d"], quiz: { question: "?", answers: ["a"], correctAnswer: 0, explanation: "ok" } }) }).estimatedMinutes).toBe(6);
  });

  it("reprend une session interrompue sans repartir de zéro", () => {
    const base = buildNoxDailySession({ mission: mission(), now: new Date("2026-09-02T10:00:00Z"), timeZone: "Europe/Paris" });
    const stored: StoredNoxDailySession = { schemaVersion: 1, sessionId: base.sessionId, dateKey: base.dateKey, timeZone: base.timeZone, status: "started", completedExerciseIds: ["a"], successfulExercises: 1, startedAt: "2026-09-02T10:01:00Z", completedAt: null, updatedAt: "2026-09-02T10:02:00Z", completionEventSent: false };
    const resumed = buildNoxDailySession({ mission: mission(), stored, now: new Date("2026-09-02T11:00:00Z"), timeZone: "Europe/Paris" });
    expect(resumed).toMatchObject({ status: "started", currentStep: 2, completedExerciseIds: ["a"] });
  });

  it("déduit la complétion des résultats uniques existants", () => {
    const results = ["a", "b", "c"].map((exerciseId) => ({ exerciseId, success: true, mistakes: 0, hintsUsed: 0, completedAt: "2026-09-02T10:00:00Z" }));
    const completed = buildNoxDailySession({ mission: mission({ status: "completed", currentStep: 3, results, completedAt: "2026-09-02T10:05:00Z" }) });
    expect(completed).toMatchObject({ status: "completed", successfulExercises: 3, currentStep: 5 });
  });

  it("respecte le jour local plutôt que minuit UTC", () => {
    const instant = new Date("2026-09-01T22:30:00Z");
    expect(getLocalSessionDateKey(instant, "Europe/Paris")).toBe("2026-09-02");
    expect(getLocalSessionDateKey(instant, "America/New_York")).toBe("2026-09-01");
  });
});
