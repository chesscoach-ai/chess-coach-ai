import { describe, expect, it } from "vitest";
import { previewEntitlements, resolveKnightlyDevPreview } from "@/lib/billing/devPreview";

describe("Knightly+ DEV preview", () => {
  it("supports controlled development scenarios", () => {
    expect(resolveKnightlyDevPreview("plus", "development")).toBe("plus");
    expect(previewEntitlements("plus").plan).toBe("plus");
    expect(previewEntitlements("quota").plan).toBe("free");
  });

  it("refuses every preview in production", () => {
    for (const preview of ["free", "plus", "quota", "soft", "unavailable"]) {
      expect(resolveKnightlyDevPreview(preview, "production")).toBeNull();
    }
  });
});
