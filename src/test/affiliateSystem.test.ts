import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  captureReferral,
  clearStoredReferral,
  getStoredReferral,
  normalizeReferralCode,
} from "@/lib/affiliate";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("affiliate attribution client contract", () => {
  beforeEach(() => clearStoredReferral());

  it("keeps a valid first touch and refuses to overwrite it", () => {
    expect(normalizeReferralCode("../lt_valid-code<script>")).toBe("lt_valid-codescript");

    const first = captureReferral("lt_first_partner");
    const second = captureReferral("lt_second_partner");

    expect(first?.code).toBe("lt_first_partner");
    expect(second?.code).toBe("lt_first_partner");
    expect(getStoredReferral()?.code).toBe("lt_first_partner");
  });

  it("reserves /ref without moving root-level user slugs", () => {
    const app = readWorkspaceFile("src/App.tsx");
    const vercel = readWorkspaceFile("vercel.json");

    expect(app.indexOf('path="/ref/:referralCode"')).toBeLessThan(app.indexOf('path="/:username"'));
    expect(vercel).toContain('"source": "/ref/:path*"');
    expect(vercel).toContain('"source": "/:slug"');
  });
});

describe("affiliate server invariants", () => {
  it("creates commission in the paid-invoice transaction using integer cents", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");

    expect(hook).toContain("stripeUtils.createFirstPaymentCommission(txApp");
    expect(hook).toContain("amountPaidCents: invoice.amount_paid");
    expect(utils).toContain("Math.floor(amountPaidCents * rateBps / 10000)");
    expect(utils).toContain('attribution.get("risk_status") === "review" ? "review" : "pending"');
    expect(utils).toContain("new DateTime().addDate(0, 0, 30)");
  });

  it("has database-level idempotency for invoice and referred account", () => {
    const migration = readWorkspaceFile("pocketbase/pb_migrations/1785200000_create_affiliate_system.js");

    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_attributions_user");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_commissions_invoice");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_commissions_attribution");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_payouts_reference");
  });

  it("supports no-reward offers, frozen rates, and refund reconciliation", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");

    expect(hook).toContain('"reward_enabled": false');
    expect(hook).toContain('"commission_rate_bps": 0');
    expect(hook).toContain('verifiedEvent.type === "charge.refunded" || verifiedEvent.type === "refund.created"');
    expect(utils).toContain("reconcileAffiliateRefund");
    expect(utils).toContain('"commission_rate_bps": bps');
  });
});
