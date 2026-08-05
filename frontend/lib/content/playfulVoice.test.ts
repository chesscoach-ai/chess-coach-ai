import { describe, expect, it } from "vitest";

import {
  getCheckmateAside,
  getReminderMessage,
} from "@/lib/content/playfulVoice";

describe("playful product voice", () => {
  it("keeps reminders deterministic for one day", () => {
    const date = new Date(
      "2026-07-28T12:00:00",
    );
    expect(getReminderMessage(date)).toBe(
      getReminderMessage(date),
    );
  });

  it("keeps the joke tied to the result", () => {
    expect(
      getCheckmateAside(true),
    ).toContain("roi adverse");
    expect(
      getCheckmateAside(false),
    ).toContain("Ton roi");
  });
});
