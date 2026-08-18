import { describe, expect, it } from "vitest";

import {
  appendNoxExchange,
  currentNoxSession,
} from "@/lib/nox/noxSession";

const reply = {
  state: "tip" as const,
  title: "Ton plan",
  message: "Développe ton cavalier.",
};

describe("session de conversation Nox", () => {
  it("conserve un historique court dans la même position", () => {
    const first = appendNoxExchange(null, "p1", "Mon plan ?", reply, "plan", "1");
    const second = appendNoxExchange(first, "p1", "Montre-moi", reply, "show", "2");
    expect(second.messages.map((message) => message.role)).toEqual([
      "user",
      "nox",
      "user",
      "nox",
    ]);
  });

  it("rend l’ancien historique inaccessible après un changement de position", () => {
    const session = appendNoxExchange(null, "p1", "Mon plan ?", reply, "plan", "1");
    expect(currentNoxSession(session, "p2")).toBeNull();
    const next = appendNoxExchange(session, "p2", "Pourquoi ?", reply, "why", "2");
    expect(next.messages).toHaveLength(2);
    expect(next.contextKey).toBe("p2");
  });

  it("un reset supprime toute la session", () => {
    const session = appendNoxExchange(null, "p1", "Mon plan ?", reply, "plan", "1");
    expect(currentNoxSession(session, "p1")).not.toBeNull();
    expect(currentNoxSession(null, "p1")).toBeNull();
  });
});
