import { describe, expect, it } from "vitest";
import { formatBillingDate } from "@/lib/billing";

describe("billing dates", () => {
  it("does not invent a date when Stripe has not supplied a billing boundary", () => {
    expect(formatBillingDate()).toBe("—");
    expect(formatBillingDate("")).toBe("—");
    expect(formatBillingDate("not-a-date")).toBe("—");
  });

  it("formats a persisted Stripe period boundary", () => {
    expect(formatBillingDate("2026-08-15 12:00:00.000Z", "en-US")).toBe("Aug 15, 2026");
  });
});
