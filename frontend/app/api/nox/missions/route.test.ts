import { afterEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedPlayer = vi.fn(async () => null);
const getActiveNoxMission = vi.fn();
vi.mock("@/lib/multiplayer/playerSession", () => ({ getAuthenticatedPlayer }));
vi.mock("@/lib/nox/missionStore", () => ({ getActiveNoxMission, recordNoxMissionResult: vi.fn(), startNoxMission: vi.fn() }));

describe("outils DEV des missions Nox", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

  it("répond 404 en production avant toute lecture de session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/nox/missions", { method: "POST", body: JSON.stringify({ action: "dev_generate", conceptId: "king_safety" }) }));
    expect(response.status).toBe(404);
    expect(getAuthenticatedPlayer).not.toHaveBeenCalled();
    expect(getActiveNoxMission).not.toHaveBeenCalled();
  });

  it("exige une connexion en développement", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/nox/missions", { method: "POST", body: JSON.stringify({ action: "dev_generate", conceptId: "king_safety" }) }));
    expect(response.status).toBe(401);
  });
});
