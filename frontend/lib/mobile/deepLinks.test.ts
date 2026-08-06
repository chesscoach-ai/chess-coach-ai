import { describe, expect, it } from "vitest";

import { resolveMobileRoute } from "@/lib/mobile/deepLinks";

describe("mobile deep links", () => {
  it("opens a shared friend invitation", () => {
    expect(resolveMobileRoute("chessclan://join/K7m2qx"))
      .toBe("/?mode=multiplayer&kind=friend&invite=K7M2QX");
  });

  it("opens supported native destinations", () => {
    expect(resolveMobileRoute("chessclan://play/online"))
      .toBe("/?mode=multiplayer&kind=online");
    expect(resolveMobileRoute("chessclan://exercises"))
      .toBe("/exercises");
  });

  it("rejects unsafe and malformed destinations", () => {
    expect(resolveMobileRoute("chessclan://unknown/value")).toBeNull();
    expect(resolveMobileRoute("javascript:alert(1)")).toBeNull();
    expect(resolveMobileRoute("chessclan://join/NO")).toBeNull();
  });
});
