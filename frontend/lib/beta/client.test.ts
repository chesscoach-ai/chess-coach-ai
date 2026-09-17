import { afterEach, expect, it, vi } from "vitest";
import { trackBetaEvent } from "@/lib/beta/client";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("sends no event and touches no visitor storage in ritual previews", () => {
  vi.stubEnv("NODE_ENV", "development");
  const storage = { getItem: vi.fn(), setItem: vi.fn() };
  const fetch = vi.fn();
  vi.stubGlobal("window", { location: { search: "?ritualPreview=active_session" }, localStorage: storage });
  vi.stubGlobal("fetch", fetch);
  trackBetaEvent("return_context_viewed");
  trackBetaEvent("app_opened");
  expect(fetch).not.toHaveBeenCalled();
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
});
