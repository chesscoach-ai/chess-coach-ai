import { describe, expect, it } from "vitest";

import { buildDailyCoachPlan } from "@/lib/coach/dailyMission";
import type { LearningProfile } from "@/lib/learning/types";

describe("daily coach mission", () => {
  it("keeps one stable mission during the day", () => {
    const first = buildDailyCoachPlan(
      null,
      new Date(
        "2026-07-28T08:00:00",
      ),
    );
    const second = buildDailyCoachPlan(
      null,
      new Date(
        "2026-07-28T21:00:00",
      ),
    );
    expect(second.id).toBe(first.id);
  });

  it("turns the main weakness into a relevant exercise", () => {
    const profile = {
      primaryWeakness: "endgame",
      rating: 1_350,
    } as LearningProfile;
    const plan = buildDailyCoachPlan(
      profile,
      new Date(
        "2026-07-28T12:00:00",
      ),
    );

    expect(plan.focus).toBe("endgame");
    expect(plan.exercise.category).toBe(
      "endgame",
    );
    expect(plan.exercise.difficulty).toBe(
      "intermédiaire",
    );
  });
});
