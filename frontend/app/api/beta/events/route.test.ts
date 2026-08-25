import { beforeEach, describe, expect, it, vi } from "vitest";

const recordBetaEvent = vi.fn();
vi.mock("@/lib/beta/store", () => ({ recordBetaEvent }));
vi.mock("@/lib/beta/rateLimit", () => ({ allowBetaRequest: () => true }));

describe("événements d’activation bêta", () => {
  beforeEach(() => vi.clearAllMocks());
  it("refuse un événement inconnu", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/beta/events", { method: "POST", body: JSON.stringify({ eventName: "email_captured", visitorId: crypto.randomUUID(), page: "/", platform: "web", version: "test" }) }));
    expect(response.status).toBe(400);
    expect(recordBetaEvent).not.toHaveBeenCalled();
  });
  it("accepte un événement pseudonyme prévu", async () => {
    const { POST } = await import("./route");
    const payload = { eventName: "game_started", visitorId: crypto.randomUUID(), page: "/?mode=multiplayer", platform: "web", version: "0.1.0-beta.1" };
    const response = await POST(new Request("http://localhost/api/beta/events", { method: "POST", body: JSON.stringify(payload) }));
    expect(response.status).toBe(204);
    expect(recordBetaEvent).toHaveBeenCalledWith(payload);
  });
});
