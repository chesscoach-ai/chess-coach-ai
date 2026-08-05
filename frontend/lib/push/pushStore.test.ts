import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isReminderDue,
  isValidTimeZone,
} from "@/lib/push/pushStore";

describe("push reminders", () => {
  it("sends only during the 90-minute delivery window", () => {
    expect(
      isReminderDue("18:59", "19:00"),
    ).toBe(false);
    expect(
      isReminderDue("19:00", "19:00"),
    ).toBe(true);
    expect(
      isReminderDue("20:29", "19:00"),
    ).toBe(true);
    expect(
      isReminderDue("20:30", "19:00"),
    ).toBe(false);
  });

  it("rejects invented timezones", () => {
    expect(
      isValidTimeZone("Europe/Paris"),
    ).toBe(true);
    expect(
      isValidTimeZone(
        "Royaume/Des-Chevaliers",
      ),
    ).toBe(false);
  });
});
