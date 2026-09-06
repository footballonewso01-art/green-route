import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  campaignCostPerSignup,
  campaignRate,
  campaignStatusLabel,
  formatCampaignMoney,
  type MarketingCampaign,
} from "@/lib/marketingCampaigns";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const campaign = (overrides: Partial<MarketingCampaign> = {}): MarketingCampaign => ({
  id: "campaign_1",
  name: "Launch",
  tracking_key: "cmp_launch123",
  objective: "signups",
  status: "active",
  is_live: true,
  landing_path: "/pricing",
  budget_cents: 50_000,
  spent_cents: 12_500,
  currency: "USD",
  starts_at: "",
  ends_at: "",
  notes: "",
  promocode: null,
  placements: [],
  metrics: { visits: 120, unique_visitors: 100, signups: 10, activated: 7, paid: 2, revenue: 48, promo_uses: 0 },
  created: "2026-09-06T00:00:00Z",
  updated: "2026-09-06T00:00:00Z",
  ...overrides,
});

describe("project marketing campaigns", () => {
  it("calculates presentation metrics without mixing money units", () => {
    expect(campaignRate(2, 10)).toBe(20);
    expect(campaignCostPerSignup(campaign())).toBe(1_250);
    expect(formatCampaignMoney(1_250, "USD")).toBe("$12.50");
    expect(campaignStatusLabel(campaign())).toBe("Live");
  });

  it("keeps campaign visits and project offers outside customer and affiliate ledgers", () => {
    const migration = read("pocketbase/pb_migrations/1788621000_create_marketing_campaigns.js");
    const billingMigration = read("pocketbase/pb_migrations/1788622000_allow_zero_value_promo_billing.js");
    const module = read("pocketbase/pb_hooks/marketing_campaigns.js");
    expect(migration).toContain("CREATE TABLE marketing_campaign_visits");
    expect(migration).toContain("createRule: null");
    expect(module).toContain("commission_rate_bps: 0");
    expect(module).toContain("Partner-owned promocodes cannot be reassigned");
    expect(module).not.toMatch(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(?:clicks|affiliate_attributions|affiliate_commissions)\b/i);
    expect(billingMigration).toContain("amount.required = false");
    expect(billingMigration).not.toMatch(/(?:createRule|updateRule)\s*=/);
  });

  it("requires the trusted edge for public visit writes and preserves first-touch reporting", () => {
    const module = read("pocketbase/pb_hooks/marketing_campaigns.js");
    const worker = read("cloudflare/worker.ts");
    const hooks = read("pocketbase/pb_hooks/main.pb.js");
    expect(module).toContain("utils.isTrustedRedirectEdgeRequest(c)");
    expect(module).toContain("traffic_quality != 'automated'");
    expect(module).toContain("ge.event_name = 'signup_completed'");
    expect(worker).toContain("isCampaignVisit");
    expect(hooks).toContain('routerAdd("POST", "/api/campaigns/visit/{slug}"');
    expect(hooks).toContain("campaignIsLive");
  });

  it("deletes only unused campaign entities and archives recorded attribution", () => {
    const moduleContainer = { exports: {} as Record<string, unknown> };
    const source = read("pocketbase/pb_hooks/marketing_campaigns.js");
    runInNewContext(source, { module: moduleContainer, require: () => ({}) });
    const removalMode = moduleContainer.exports.removalModeForHistory as (
      history: { visits?: number; growth_events?: number; promo_uses?: number },
      includePromoUses: boolean,
    ) => "delete" | "archive";

    expect(removalMode({ visits: 0, growth_events: 0, promo_uses: 0 }, true)).toBe("delete");
    expect(removalMode({ visits: 1 }, false)).toBe("archive");
    expect(removalMode({ growth_events: 1 }, false)).toBe("archive");
    expect(removalMode({ promo_uses: 1 }, false)).toBe("delete");
    expect(removalMode({ promo_uses: 1 }, true)).toBe("archive");

    expect(source).toContain('txCampaign.set("status", "archived")');
    expect(source).toContain('placements[i].set("is_active", false)');
    expect(source).toContain('promo.set("is_active", false)');
    expect(source).toContain('txApp.delete(txCampaign)');
    expect(source).not.toMatch(/DELETE\s+FROM\s+(?:growth_events|clicks|affiliate_\w+)/i);
    const hooks = read("pocketbase/pb_hooks/main.pb.js");
    expect(hooks).toContain('routerAdd("DELETE", "/api/admin/campaigns/{id}"');
    expect(hooks).toContain('routerAdd("DELETE", "/api/admin/campaigns/{id}/placements/{placementId}"');
  });
});
