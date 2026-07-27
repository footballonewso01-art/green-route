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
  it("creates recurring commission in every paid-invoice transaction using integer cents", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");

    expect(hook).toContain("stripeUtils.createAffiliateCommission(txApp");
    expect(hook).toContain("amountPaidCents: invoice.amount_paid");
    expect(hook).toContain('billingReason: invoice.billing_reason || ""');
    expect(utils).toContain("Math.floor(amountPaidCents * rateBps / 10000)");
    expect(utils).toContain('"commission_type": commissionType');
    expect(utils).toContain('var commissionType = firstPaidInvoiceId ? "renewal" : "initial"');
    expect(utils).toContain('attribution.get("risk_status") === "review" ? "review" : "pending"');
    expect(utils).toContain("new DateTime().addDate(0, 0, 30)");
  });

  it("allows many commissions per referral but only one per Stripe invoice", () => {
    const migration = readWorkspaceFile("pocketbase/pb_migrations/1785200000_create_affiliate_system.js");
    const recurringMigration = readWorkspaceFile(
      "pocketbase/pb_migrations/1785200003_enable_recurring_affiliate_commissions.js",
    );
    const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");

    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_attributions_user");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_commissions_invoice");
    expect(recurringMigration).toContain("DROP INDEX IF EXISTS idx_affiliate_commissions_attribution");
    expect(recurringMigration).toContain("idx_affiliate_commissions_attribution_created");
    expect(utils).toContain('"stripe_invoice_id = {:invoiceId}"');
    expect(utils).not.toContain('"attribution_id = {:attributionId} || stripe_invoice_id = {:invoiceId}"');
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

  it("uses exact days for promocode rewards with a legacy-month migration", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const migration = readWorkspaceFile(
      "pocketbase/pb_migrations/1785200004_use_daily_promocode_rewards.js",
    );
    const partnerOverview = readWorkspaceFile("src/pages/PartnerOverview.tsx");
    const adminPromocodes = readWorkspaceFile("src/pages/admin/AdminPromocodes.tsx");

    expect(hook).toContain('"reward_days": 0');
    expect(hook).toContain("now.addDate(0, 0, txRewardDays)");
    expect(hook).toContain("Reward duration must be between 1 and 1095 days.");
    expect(migration).toContain("SET reward_days = reward_months * 30");
    expect(migration).toContain("SET reward_months = 0");
    expect(adminPromocodes).toContain("Duration in days");
    expect(adminPromocodes).toContain("reward_days:");
    expect(adminPromocodes).not.toContain("newRewardMonths");
    expect(partnerOverview).toContain("code.reward_days");
  });

  it("reports renewal earnings clearly in partner and admin interfaces", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const partnerOverview = readWorkspaceFile("src/pages/PartnerOverview.tsx");
    const adminPromocodes = readWorkspaceFile("src/pages/admin/AdminPromocodes.tsx");

    expect(hook).toContain("renewal_payments");
    expect(partnerOverview).toContain("Initial and renewal commissions");
    expect(partnerOverview).toContain("from renewals");
    expect(adminPromocodes).toContain("every successful subscription payment, including renewals");
    expect(adminPromocodes).not.toContain("First-payment commission");
  });

  it("returns zeroed plan totals for partners without referrals", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const partnerOverview = readWorkspaceFile("src/pages/PartnerOverview.tsx");

    expect(hook).toContain("END), 0) AS creator");
    expect(hook).toContain("END), 0) AS pro");
    expect(hook).toContain("END), 0) AS agency");
    expect(partnerOverview).toContain("retryOnMount: false");
    expect(partnerOverview).toContain('requestKey: "affiliate-overview"');
  });
});
