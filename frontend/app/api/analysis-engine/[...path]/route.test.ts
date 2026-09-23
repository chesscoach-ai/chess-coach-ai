import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedPlayer = vi.fn();
const hasActiveCompetitiveGame = vi.fn();
const getAnalysisEntitlement = vi.fn();
const fetchBackend = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/multiplayer/playerSession", () => ({ getAuthenticatedPlayer }));
vi.mock("@/lib/multiplayer/gameStore", () => ({ hasActiveCompetitiveGame }));
vi.mock("@/lib/billing/subscriptionStore", () => ({ getAnalysisEntitlement }));
vi.mock("@/lib/billing/gameReviewStore", () => ({ canAccessGameReview: vi.fn() }));
vi.mock("@/lib/api/backendServer", () => ({
  fetchBackend,
  readBackendPayload: vi.fn(),
  withBackendError: vi.fn(),
}));

describe("fair-play de la passerelle d’analyse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedPlayer.mockResolvedValue({ id: "player-a" });
    getAnalysisEntitlement.mockResolvedValue({ hasAccess: true });
  });

  it("refuse Stockfish pendant une partie compétitive active", async () => {
    hasActiveCompetitiveGame.mockResolvedValue(true);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/analysis-engine/analyze", {
        method: "POST",
        body: JSON.stringify({ fen: "startpos" }),
      }),
      { params: Promise.resolve({ path: ["analyze"] }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "FAIR_PLAY_RESTRICTED",
    });
    expect(getAnalysisEntitlement).not.toHaveBeenCalled();
    expect(fetchBackend).not.toHaveBeenCalled();
  });
});
