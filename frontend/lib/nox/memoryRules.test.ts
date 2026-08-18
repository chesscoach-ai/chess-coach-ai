import { describe, expect, it } from "vitest";

import { applyLearningEvent, applyRecency, createNoxMemoryProfile, summarizeNoxMemory } from "@/lib/nox/memoryRules";
import type { LearningEvent, NoxMemoryProfile } from "@/lib/nox/memoryTypes";

function event(
  index: number,
  outcome: LearningEvent["outcome"],
  conceptId: LearningEvent["conceptId"] = "king_safety",
  occurredAt = `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
): LearningEvent {
  return {
    id: `event-${index}`,
    type: "move_review",
    conceptId,
    outcome,
    occurredAt,
    sourceId: `source-${index}`,
  };
}

function apply(profile: NoxMemoryProfile, events: LearningEvent[]) {
  return events.reduce(applyLearningEvent, profile);
}

describe("mémoire pédagogique de Nox", () => {
  it("crée un profil vide sans donnée personnelle", () => {
    const profile = createNoxMemoryProfile(new Date("2026-08-01T12:00:00Z"));
    expect(profile.mastery).toEqual({});
    expect(JSON.stringify(profile)).not.toContain("email");
  });

  it("une première erreur reste un signal faible", () => {
    const profile = applyLearningEvent(createNoxMemoryProfile(), event(0, "failure"));
    expect(profile.mastery.king_safety?.status).toBe("observing");
    expect(summarizeNoxMemory(profile).weaknesses).toEqual([]);
  });

  it("plusieurs erreurs cohérentes créent une faiblesse probable", () => {
    const profile = apply(createNoxMemoryProfile(), [event(0, "failure"), event(1, "failure"), event(2, "failure")]);
    expect(profile.mastery.king_safety?.status).toBe("weakness");
    expect(summarizeNoxMemory(profile).weaknesses).toContain("king_safety");
    expect(profile.goals[0]?.conceptId).toBe("king_safety");
  });

  it("plusieurs réussites créent une force", () => {
    const profile = apply(createNoxMemoryProfile(), [
      event(0, "success", "forks"),
      event(1, "success", "forks"),
      event(2, "success", "forks"),
    ]);
    expect(profile.mastery.forks?.status).toBe("mastered");
    expect(summarizeNoxMemory(profile).strengths).toContain("forks");
  });

  it("fait évoluer une faiblesse vers en progrès après des réussites répétées", () => {
    const profile = apply(createNoxMemoryProfile(), [
      event(0, "failure"), event(1, "failure"), event(2, "failure"),
      event(3, "success"), event(4, "success"),
    ]);
    expect(profile.mastery.king_safety?.status).toBe("improving");
    expect(summarizeNoxMemory(profile).improving).toContain("king_safety");
    expect(profile.milestones.some((item) => item.kind === "important_improvement")).toBe(true);
  });

  it("ramène progressivement une observation ancienne vers une estimation neutre", () => {
    expect(applyRecency(14, "2026-01-01T00:00:00Z", "2026-05-21T00:00:00Z")).toBeGreaterThan(14);
    expect(applyRecency(86, "2026-01-01T00:00:00Z", "2026-05-21T00:00:00Z")).toBeLessThan(86);
  });
});

