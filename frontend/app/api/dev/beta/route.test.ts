import { afterEach, describe, expect, it, vi } from "vitest";

const getBetaDiagnostics = vi.fn();
vi.mock("@/lib/beta/store", () => ({ getBetaDiagnostics }));

describe("diagnostic bêta DEV", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
  it("répond 404 en production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(404);
    expect(getBetaDiagnostics).not.toHaveBeenCalled();
  });
});
