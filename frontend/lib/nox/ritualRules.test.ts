import { describe, expect, it } from "vitest";

import { buildNoxReturnRecommendation, buildNoxWeeklySummary, buildRitualPreviewContext, getReturnBucket, resolveRitualPreview, type NoxReturnContext } from "@/lib/nox/ritualRules";

const now = new Date("2026-09-04T12:00:00Z");
const base = (overrides: Partial<NoxReturnContext> = {}): NoxReturnContext => ({ now, timeZone: "Europe/Paris", firstVisit: false, lastActiveAt: "2026-09-04T08:00:00Z", activeGame: false, dailySessionStatus: null, ...overrides });

describe("Knightly ritual", () => {
  it("uses the local calendar across midnight and daylight-saving transitions", () => {
    expect(getReturnBucket(base({ now: new Date("2026-09-04T22:05:00Z"), lastActiveAt: "2026-09-04T21:55:00Z" }))).toBe("return_1_3_days");
    const summary = buildNoxWeeklySummary({ now: new Date("2026-03-30T22:30:00Z"), timeZone: "Europe/Paris", activityDateKeys: [], gameEndedAt: [], sessionCompletedAt: [], consolidatedAt: [] });
    expect(new Set(summary.days.map(day => day.dateKey)).size).toBe(7);
    expect(summary.days[6].dateKey).toBe("2026-03-31");
  });

  it("rejects future and expired improvement evidence", () => {
    for (const date of ["2027-01-01T00:00:00Z", "2025-01-01T00:00:00Z", "invalid"]) {
      expect(buildNoxReturnRecommendation(base({ recentImprovement: { label: "les fourchettes", evidenceCount: 4, lastObservedAt: date } })).moment).toBeUndefined();
    }
  });
  it("distinguishes first visit, same day, 1-3 days and a long absence", () => {
    expect(getReturnBucket(base({ firstVisit: true, lastActiveAt: null }))).toBe("first_visit");
    expect(getReturnBucket(base())).toBe("same_day");
    expect(getReturnBucket(base({ lastActiveAt: "2026-09-03T08:00:00Z" }))).toBe("return_1_3_days");
    expect(getReturnBucket(base({ lastActiveAt: "2026-09-01T08:00:00Z" }))).toBe("return_1_3_days");
    expect(getReturnBucket(base({ lastActiveAt: "2026-08-21T08:00:00Z" }))).toBe("return_long");
  });

  it("prioritizes a verified game, then an active session", () => {
    expect(buildNoxReturnRecommendation(base({ activeGame: true, dailySessionStatus: "started" })).primaryAction.type).toBe("resume_game");
    expect(buildNoxReturnRecommendation(base({ dailySessionStatus: "started" })).primaryAction.type).toBe("resume_session");
  });

  it("starts a first visit with play and a secondary discovery", () => {
    const result = buildNoxReturnRecommendation(base({ firstVisit: true, lastActiveAt: null }));
    expect(result.primaryAction.type).toBe("play");
    expect(result.secondaryAction?.type).toBe("discover_position");
  });

  it("uses a real recent concept but refuses weak evidence", () => {
    const trusted = buildNoxReturnRecommendation(base({ lastActiveAt: "2026-09-03T10:00:00Z", recentConcept: { label: "la sécurité du roi", lastObservedAt: "2026-09-02T10:00:00Z", observations: 3 } }));
    expect(trusted.contextSource).toBe("memory");
    expect(trusted.message).toContain("sécurité du roi");
    const weak = buildNoxReturnRecommendation(base({ lastActiveAt: "2026-09-03T10:00:00Z", recentConcept: { label: "les fourchettes", lastObservedAt: "2026-09-02T10:00:00Z", observations: 1 } }));
    expect(weak.message).not.toContain("fourchettes");
  });

  it("welcomes a long return without guilt", () => {
    const message = buildNoxReturnRecommendation(base({ lastActiveAt: "2026-08-01T10:00:00Z" })).message;
    expect(message).toMatch(/revoir|retrouver/);
    expect(message).not.toMatch(/abandonn|perdu|retard/i);
  });

  it("shows progress moments only with sufficient evidence or real remaining rules", () => {
    expect(buildNoxReturnRecommendation(base({ recentImprovement: { label: "protéger tes pièces", evidenceCount: 3, lastObservedAt: now.toISOString() } })).moment?.kind).toBe("improvement");
    expect(buildNoxReturnRecommendation(base({ recentImprovement: { label: "protéger tes pièces", evidenceCount: 1, lastObservedAt: now.toISOString() } })).moment).toBeUndefined();
    expect(buildNoxReturnRecommendation(base({ nearEvolution: { nextRankLabel: "Chevalier", remaining: "une maîtrise à confirmer" } })).moment?.message).toContain("une maîtrise à confirmer");
  });

  it("is deterministic within a context and changes variants across dates", () => {
    const same = buildNoxReturnRecommendation(base({ dailySessionStatus: "completed" })).message;
    expect(buildNoxReturnRecommendation(base({ dailySessionStatus: "completed" })).message).toBe(same);
    const variants = Array.from({ length: 8 }, (_, index) => buildNoxReturnRecommendation(base({ now: new Date(now.getTime() + index * 86_400_000), lastActiveAt: new Date(now.getTime() + index * 86_400_000 - 3_600_000).toISOString(), dailySessionStatus: "completed" })).message);
    expect(new Set(variants).size).toBeGreaterThan(1);
  });

  it("builds a timezone-aware weekly summary without XP", () => {
    const summary = buildNoxWeeklySummary({ now, timeZone: "Europe/Paris", activityDateKeys: ["2026-09-01", "2026-09-04"], gameEndedAt: ["2026-09-03T12:00:00Z"], sessionCompletedAt: ["2026-09-02T18:00:00Z"], consolidatedAt: ["2026-09-01T09:00:00Z"] });
    expect(summary.days).toHaveLength(7);
    expect(summary).toMatchObject({ activeDays: 4, games: 1, sessions: 1, consolidatedConcepts: 1 });
    expect(summary).not.toHaveProperty("xp");
  });

  it("keeps guest and offline fallbacks honest", () => {
    const result = buildNoxReturnRecommendation(base({ lastActiveAt: null, guest: true, offline: true }));
    expect(result.contextSource).toBe("fallback");
    expect(result.reason).toContain("indisponibles");
  });

  it("exposes every DEV scenario but refuses previews in production", () => {
    expect(buildRitualPreviewContext("active_session").dailySessionStatus).toBe("started");
    expect(resolveRitualPreview("return_14_days", "development")).toBe("return_14_days");
    expect(resolveRitualPreview("active_game", "production")).toBeNull();
  });
});
