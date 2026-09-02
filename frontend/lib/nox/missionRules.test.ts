import { describe, expect, it } from "vitest";
import { applyLearningEvent, createNoxMemoryProfile } from "@/lib/nox/memoryRules";
import { buildNoxMission } from "@/lib/nox/missionRules";
import type { LearningEvent } from "@/lib/nox/memoryTypes";
import { PGN_EXAMPLES } from "@/data/pgn/examples";
import { buildExercise } from "@/lib/exercise/buildExercise";

function failures(): { profile: ReturnType<typeof createNoxMemoryProfile>; events: LearningEvent[] } {
  const events: LearningEvent[] = Array.from({ length: 3 }, (_, index) => ({ id: `f${index}`, sourceId: `game:${index}`, type: "move_review", conceptId: "king_safety", outcome: "failure", occurredAt: `2026-08-0${index + 1}T12:00:00Z` }));
  return { profile: events.reduce(applyLearningEvent, createNoxMemoryProfile(),), events };
}

describe("missions personnalisées de Nox", () => {
  it("propose une découverte honnête au nouveau joueur et au visiteur", () => {
    const mission = buildNoxMission({ profile: createNoxMemoryProfile(), events: [], date: new Date("2026-08-18T10:00:00Z") });
    expect(mission).toMatchObject({ reasonCode: "guided_discovery", difficulty: "discovery", persistent: false });
    expect(mission.reason).toContain("Mission découverte");
    expect(mission.exerciseIds.length).toBeGreaterThanOrEqual(3);
  });

  it("transforme une faiblesse confirmée en mission explicable", () => {
    const memory = failures();
    const mission = buildNoxMission({ ...memory, date: new Date("2026-08-18T10:00:00Z"), persistent: true });
    expect(mission).toMatchObject({ conceptId: "king_safety", reasonCode: "weakness_confirmed", confidence: "high", difficulty: "discovery" });
    expect(mission.reason).toContain("J’ai remarqué");
    expect(mission.quiz?.correctAnswer).toBe(0);
    const solutions = mission.exerciseIds.map((id) => buildExercise(PGN_EXAMPLES.find((item) => item.id === id)!.pgn).solutionSan);
    expect(solutions.every((solution) => solution.startsWith("O-O"))).toBe(true);
  });

  it("utilise uniquement des positions existantes et une durée de 3 à 5 minutes", () => {
    const mission = buildNoxMission({ profile: createNoxMemoryProfile(), events: [], forcedConcept: "forks" });
    expect(mission.exerciseIds).toHaveLength(4);
    expect(mission.estimatedMinutes).toBeGreaterThanOrEqual(3);
    expect(mission.estimatedMinutes).toBeLessThanOrEqual(5);
  });

  it("fait tourner une faiblesse dominante après deux missions récentes", () => {
    const memory = failures();
    memory.profile = applyLearningEvent(memory.profile, { id: "d", sourceId: "d", type: "move_review", conceptId: "development", outcome: "failure", occurredAt: "2026-08-04T12:00:00Z" });
    memory.profile.mastery.development = { ...memory.profile.mastery.king_safety!, conceptId: "development" };
    const mission = buildNoxMission({ ...memory, recentConcepts: ["king_safety", "king_safety"], date: new Date("2026-08-18T10:00:00Z"), persistent: true });
    expect(mission.conceptId).toBe("development");
  });

  it("espace davantage la révision d’un concept maîtrisé", () => {
    const memory = failures();
    memory.profile.mastery.king_safety = { ...memory.profile.mastery.king_safety!, status: "mastered", score: 82 };
    const mission = buildNoxMission({ ...memory, date: new Date("2026-08-18T10:00:00Z"), persistent: true });
    expect(mission.difficulty).toBe("mastery");
    expect(new Date(mission.nextEligibleAt).getTime() - new Date(mission.createdAt).getTime()).toBe(10 * 86_400_000);
  });

  it("préfère un échec récent à une révision espacée", () => {
    const profile = createNoxMemoryProfile();
    profile.mastery.endgame = { conceptId: "endgame", status: "mastered", weaknessObserved: false, score: 82, observations: 5, successes: 5, failures: 0, lastObservedAt: "2026-07-01T12:00:00Z", trend: "up" };
    const events: LearningEvent[] = [{ id: "recent", sourceId: "recent", type: "move_review", conceptId: "calculation", outcome: "failure", occurredAt: "2026-08-17T12:00:00Z" }];
    const mission = buildNoxMission({ profile, events, date: new Date("2026-08-18T10:00:00Z"), persistent: true });
    expect(mission).toMatchObject({ conceptId: "calculation", reasonCode: "recent_failure" });
  });

  it("sélectionne une révision espacée seulement lorsqu’elle est arrivée à échéance", () => {
    const profile = createNoxMemoryProfile();
    profile.mastery.endgame = { conceptId: "endgame", status: "mastered", weaknessObserved: false, score: 82, observations: 5, successes: 5, failures: 0, lastObservedAt: "2026-07-01T12:00:00Z", trend: "up" };
    expect(buildNoxMission({ profile, events: [], date: new Date("2026-08-18T10:00:00Z"), persistent: true }).reasonCode).toBe("spaced_review");
    profile.mastery.endgame!.lastObservedAt = "2026-08-10T12:00:00Z";
    expect(buildNoxMission({ profile, events: [], date: new Date("2026-08-18T10:00:00Z"), persistent: true }).reasonCode).toBe("guided_discovery");
  });

  it("construit son identifiant avec la date locale du joueur", () => {
    const mission = buildNoxMission({ profile: createNoxMemoryProfile(), events: [], date: new Date("2026-09-01T22:30:00Z"), timeZone: "Europe/Paris" });
    expect(mission.id).toContain("nox:2026-09-02:");
  });
});
