import { describe, expect, it } from "vitest";

import type { PGNExample } from "@/data/pgn/examples";
import { buildSkillPath } from "@/lib/learning/skillPath";

const examples = [
  {
    id: "opening",
    title: "Développement",
    subtitle: "Le centre",
    category: "opening",
    description: "Développe les pièces.",
    difficulty: "débutant",
    themes: ["centre"],
    pgn: "*",
  },
  {
    id: "tactic",
    title: "Attaque double",
    subtitle: "Une fourchette",
    category: "middlegame",
    description: "Gagne une pièce.",
    difficulty: "intermédiaire",
    themes: ["tactique"],
    pgn: "*",
  },
  {
    id: "endgame",
    title: "Roi et pion",
    subtitle: "Opposition",
    category: "endgame",
    description: "Active le roi.",
    difficulty: "débutant",
    themes: ["opposition"],
    pgn: "*",
  },
] satisfies PGNExample[];

describe("adaptive skill path", () => {
  it("starts with the first unmastered foundation", () => {
    const path = buildSkillPath({ examples, progress: {} });
    expect(path.recommendedExerciseId).toBe("opening");
    expect(path.recommendedChapterId).toBe("foundations");
  });

  it("uses an analyzed weakness and prioritizes exercises to review", () => {
    const path = buildSkillPath({
      examples,
      progress: {
        tactic: {
          exampleId: "tactic",
          startedAt: "2026-07-28T10:00:00.000Z",
          completedAt: "2026-07-28T10:02:00.000Z",
          attempts: 1,
          needsReview: true,
        },
      },
      profile: {
        primaryWeakness: "calculation",
        rating: 1_250,
      },
    });
    expect(path.recommendedChapterId).toBe("tactics");
    expect(path.recommendedExerciseId).toBe("tactic");
    expect(path.mastered).toBe(0);
  });

  it("marks a chapter mastered without locking the next ones", () => {
    const path = buildSkillPath({
      examples,
      progress: {
        opening: {
          exampleId: "opening",
          startedAt: "2026-07-28T10:00:00.000Z",
          completedAt: "2026-07-28T10:02:00.000Z",
          attempts: 1,
          needsReview: false,
        },
      },
    });
    expect(path.chapters[0].status).toBe("mastered");
    expect(path.recommendedChapterId).toBe("tactics");
    expect(path.progressPercent).toBe(33);
  });
});
