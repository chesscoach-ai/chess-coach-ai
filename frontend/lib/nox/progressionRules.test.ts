import { describe, expect, it } from "vitest";
import { createNoxMemoryProfile } from "@/lib/nox/memoryRules";
import type { ConceptMastery, LearningEvent, NoxConceptId, NoxMemoryProfile } from "@/lib/nox/memoryTypes";
import { applyNoxRankPreview, calculateNoxProgression } from "@/lib/nox/progressionRules";

const concepts: NoxConceptId[] = ["development", "king_safety", "hanging_pieces", "forks", "calculation", "material", "positioning", "endgame"];

function mastery(conceptId: NoxConceptId, status: ConceptMastery["status"], weaknessObserved = false): ConceptMastery {
  return { conceptId, status, weaknessObserved, score: status === "mastered" ? 82 : 55, observations: 5, successes: 4, failures: 1, lastObservedAt: "2026-08-10T12:00:00Z", trend: "up" };
}

function profile(items: ConceptMastery[], milestones = 0): NoxMemoryProfile {
  const base = createNoxMemoryProfile(new Date("2026-08-10T12:00:00Z"));
  return {
    ...base,
    mastery: Object.fromEntries(items.map((item) => [item.conceptId, item])),
    milestones: Array.from({ length: milestones }, (_, index) => ({ id: `m-${index}`, kind: "first_mastery" as const, conceptId: concepts[index % concepts.length], label: "Acquis", occurredAt: "2026-08-10T12:00:00Z" })),
  };
}

function events(days: number, missionDays = 0): LearningEvent[] {
  return Array.from({ length: days }, (_, index) => ({
    id: `e-${index}`,
    sourceId: `source-${index}`,
    type: index < missionDays ? "mission_completed" as const : "concept_detected" as const,
    conceptId: concepts[index % concepts.length],
    outcome: "success" as const,
    occurredAt: `2026-08-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
  }));
}

describe("progression pédagogique de Nox", () => {
  it("commence au rang Écuyer pour un nouveau compte ou un visiteur", () => {
    const result = calculateNoxProgression({ profile: profile([]), events: [] });
    expect(result.rank).toBe("squire");
    expect(result.persistent).toBe(false);
  });

  it("valorise la découverte de concepts distincts", () => {
    const one = calculateNoxProgression({ profile: profile([mastery("forks", "observing")]), events: events(1) });
    const two = calculateNoxProgression({ profile: profile([mastery("forks", "observing"), mastery("development", "improving")]), events: events(2) });
    expect(two.growthScore).toBeGreaterThan(one.growthScore);
    expect(two.rank).toBe("young-knight");
  });

  it("récompense davantage une maîtrise qu'une simple observation", () => {
    const observed = calculateNoxProgression({ profile: profile([mastery("forks", "observing")]), events: events(1) });
    const mastered = calculateNoxProgression({ profile: profile([mastery("forks", "mastered")]), events: events(1) });
    expect(mastered.growthScore - observed.growthScore).toBe(24);
  });

  it("reconnaît une faiblesse améliorée", () => {
    const repeatedPractice = events(3).map((event) => ({ ...event, conceptId: "forks" as const }));
    const ordinary = calculateNoxProgression({ profile: profile([mastery("forks", "improving")]), events: repeatedPractice });
    const corrected = calculateNoxProgression({ profile: profile([mastery("forks", "improving", true)]), events: repeatedPractice });
    expect(corrected.growthScore - ordinary.growthScore).toBe(22);
    expect(corrected.sources.join(" ")).toContain("corrigée");
  });

  it("ne transforme pas une erreur volontaire immédiatement corrigée en faiblesse résolue", () => {
    const sameDay = events(4).map((event) => ({ ...event, conceptId: "forks" as const, occurredAt: "2026-08-01T12:00:00Z" }));
    const result = calculateNoxProgression({ profile: profile([mastery("forks", "improving", true)]), events: sameDay });
    expect(result.sources.join(" ")).not.toContain("corrigée");
  });

  it("compte la régularité par jours distincts", () => {
    const base = profile([mastery("forks", "observing")]);
    expect(calculateNoxProgression({ profile: base, events: events(3) }).growthScore)
      .toBeGreaterThan(calculateNoxProgression({ profile: base, events: events(1) }).growthScore);
  });

  it("déduplique un LearningEvent et empêche le farming du même exercice", () => {
    const event = events(1)[0];
    const result = calculateNoxProgression({ profile: profile([mastery("forks", "observing")]), events: Array(50).fill(event) });
    expect(result.eventsCounted).toBe(1);
    expect(result.eventsIgnored).toBe(49);
  });

  it("ne compte qu'une mission par journée", () => {
    const sameDay = events(8, 8).map((event, index) => ({ ...event, occurredAt: "2026-08-01T12:00:00Z", sourceId: `mission-${index}` }));
    const score = calculateNoxProgression({ profile: profile([]), events: sameDay }).growthScore;
    expect(score).toBe(11);
  });

  it("atteint Chevalier grâce à plusieurs dimensions", () => {
    const learningDays = events(6, 1).map((event, index) => ({
      ...event,
      conceptId: (["development", "development", "development", "king_safety", "forks", "calculation"] as NoxConceptId[])[index],
    }));
    const result = calculateNoxProgression({
      profile: profile([mastery("development", "mastered", true), mastery("king_safety", "mastered"), mastery("forks", "learning"), mastery("calculation", "learning")], 2),
      events: learningDays,
    });
    expect(result.rank).toBe("knight");
  });

  it("conserve un rang acquis même après réinitialisation de la mémoire", () => {
    const result = calculateNoxProgression({ profile: profile([]), events: [], stored: { highestRank: "knight", lastRankChange: "2026-08-01T00:00:00Z", milestones: [] } });
    expect(result.rank).toBe("knight");
    expect(result.progressPercent).toBe(0);
  });

  it("ne transforme pas les anciennes XP ou ligues en maîtrise", () => {
    const base = calculateNoxProgression({ profile: profile([]), events: [] });
    const legacy = calculateNoxProgression({ profile: profile([]), events: [], legacy: { xp: 999_999, league: "Diamant" } });
    expect(legacy).toMatchObject({ rank: base.rank, growthScore: base.growthScore });
  });

  it("reste déterministe avec les mêmes preuves", () => {
    const input = { profile: profile([mastery("development", "improving")]), events: events(3) };
    expect(calculateNoxProgression(input)).toEqual(calculateNoxProgression(input));
  });

  it("autorise l'aperçu uniquement en développement", () => {
    const base = calculateNoxProgression({ profile: profile([]), events: [] });
    expect(applyNoxRankPreview(base, "captain", "development").rank).toBe("captain");
    expect(applyNoxRankPreview(base, "captain", "development").milestones[0]?.id).toBe("PREVIEW_NOX_REACHED_CAPTAIN");
    expect(applyNoxRankPreview(base, "captain", "production").rank).toBe("squire");
  });

  it("précise que Grand Maître est un rang de Nox", () => {
    const result = applyNoxRankPreview(calculateNoxProgression({ profile: profile([]), events: [] }), "grandmaster", "development");
    expect(result.rankLabel).toBe("Grand Maître de Nox");
  });
});
