import { describe, expect, it } from "vitest";

import {
  getPromocodeCommissionRate,
  getPromocodeRemainingUses,
  getPromocodeRewardLabel,
  getPromocodeState,
  type PromocodeRecord,
} from "@/lib/adminPromocodes";

const makePromocode = (overrides: Partial<PromocodeRecord> = {}): PromocodeRecord => ({
  id: "promo_1",
  code: "PARTNER20",
  max_uses: 100,
  current_uses: 25,
  reward_plan: "pro",
  reward_days: 45,
  reward_enabled: true,
  partner_id: "partner_1",
  commission_rate_bps: 2_000,
  is_active: true,
  created: "2026-07-27T10:00:00.000Z",
  ...overrides,
});

describe("admin promocode presentation rules", () => {
  it("separates active, depleted, and archived operational states", () => {
    expect(getPromocodeState(makePromocode())).toBe("active");
    expect(getPromocodeState(makePromocode({ current_uses: 100 }))).toBe("depleted");
    expect(getPromocodeState(makePromocode({ current_uses: 100, is_active: false }))).toBe(
      "archived",
    );
  });

  it("treats a zero redemption cap as unlimited", () => {
    expect(getPromocodeRemainingUses(makePromocode({ max_uses: 0 }))).toBeNull();
    expect(getPromocodeRemainingUses(makePromocode({ max_uses: 10, current_uses: 7 }))).toBe(3);
    expect(getPromocodeRemainingUses(makePromocode({ max_uses: 10, current_uses: 12 }))).toBe(0);
  });

  it("formats exact-day rewards and basis-point commissions consistently", () => {
    expect(getPromocodeRewardLabel(makePromocode())).toBe("PRO · 45d");
    expect(getPromocodeRewardLabel(makePromocode({ reward_enabled: false }))).toBe(
      "No signup reward",
    );
    expect(getPromocodeCommissionRate(makePromocode())).toBe(20);
  });
});
