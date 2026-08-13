import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { dollarsToCents } from "@/lib/affiliateMoney";

const readWorkspaceFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin partner payout ledger", () => {
  it("records exact currency cents without floating point rounding", () => {
    expect(dollarsToCents("29")).toBe(2900);
    expect(dollarsToCents("29.90")).toBe(2990);
    expect(dollarsToCents("0,01")).toBe(1);
    expect(dollarsToCents("0")).toBeNull();
    expect(dollarsToCents("1.001")).toBeNull();
    expect(dollarsToCents("not money")).toBeNull();
  });

  it("adds immutable payout actor fields and a partner/date index", () => {
    const migration = readWorkspaceFile(
      "pocketbase/pb_migrations/1786468000_add_affiliate_payout_audit.js",
    );

    expect(migration).toContain('name: "created_by"');
    expect(migration).toContain('name: "created_by_email"');
    expect(migration).toContain("cascadeDelete: false");
    expect(migration).toContain("idx_affiliate_payouts_partner_paid_at");
  });

  it("keeps partner inspection read-only and scopes every aggregate to the selected user", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const start = hook.indexOf('routerAdd("GET", "/api/admin/users/{id}/partner-info"');
    const end = hook.indexOf('// Admin payout ledger.', start);
    const route = hook.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(route).toContain('admin.get("role") !== "admin"');
    expect(route).toContain('"user_id = {:partnerId}"');
    expect(route).toContain("WHERE a.partner_id = {:partnerId}");
    expect(route).toContain("WHERE partner_id = {:partnerId}");
    expect(route).toContain("is_partner: isPartner");
    expect(route).toContain("var isPartner = codes.length > 0 || hasHistory");
    expect(route).not.toContain("ensureAffiliatePartner");
  });

  it("rechecks available money transactionally and writes a timestamped admin audit record", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const start = hook.indexOf('routerAdd("POST", "/api/admin/affiliate/payouts"');
    const end = hook.indexOf('// Promocodes: Validate', start);
    const route = hook.slice(start, end);

    expect(route).toContain("$app.runInTransaction");
    expect(route).toContain('"reference = {:reference}"');
    expect(route).toContain("alreadyRecorded = true");
    expect(route).toContain("if (amountCents > available)");
    expect(route).toContain('"paid_at": new DateTime()');
    expect(route).toContain('"created_by": admin.id');
    expect(route).toContain('"created_by_email": admin.get("email")');
    expect(route).toContain("Add a short payout comment for the audit log.");
  });

  it("shows Partner Info only for partners and refreshes the user-visible paid total", () => {
    const adminProfile = readWorkspaceFile("src/pages/admin/AdminUserProfile.tsx");
    const adminPartnerInfo = readWorkspaceFile("src/components/admin/AdminPartnerInfo.tsx");
    const partnerOverview = readWorkspaceFile("src/pages/PartnerOverview.tsx");

    expect(adminProfile).toContain("partnerInfo?.is_partner");
    expect(adminProfile).toContain('value="partner"');
    expect(adminProfile).toContain("onPayoutRecorded={refreshPartnerInfo}");
    expect(adminPartnerInfo).toContain("Record a payout");
    expect(adminPartnerInfo).toContain("Payout history");
    expect(adminPartnerInfo).toContain("Internal comment");
    expect(adminPartnerInfo).toContain("attemptReference");
    expect(partnerOverview).toContain("stats.paid_cents");
  });
});
