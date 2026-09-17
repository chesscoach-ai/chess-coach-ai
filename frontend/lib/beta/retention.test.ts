import { expect, it } from "vitest";
import { retentionCohorts } from "./retention";

it("keeps immature cohorts unmeasured and compares observed sessions and clans", () => {
  const events = [
    { visitorId: "a", eventName: "app_opened", createdAt: "2026-09-01T12:00:00Z" },
    { visitorId: "a", eventName: "app_opened", createdAt: "2026-09-04T12:00:00Z" },
    { visitorId: "a", eventName: "daily_session_completed", createdAt: "2026-09-01T13:00:00Z" },
    { visitorId: "a", eventName: "clan_joined", createdAt: "2026-09-01T13:00:00Z" },
    { visitorId: "b", eventName: "app_opened", createdAt: "2026-09-04T12:00:00Z" },
  ];
  const result = retentionCohorts(events, Date.parse("2026-09-05T12:00:00Z"));
  expect(result[0]).toMatchObject({ visitors: 1, d1: 100, d3: 100, d7: null });
  expect(result[1]).toMatchObject({ visitors: 1, d1: 0, d3: null });
  expect(result[2].d3).toBe(100);
});
