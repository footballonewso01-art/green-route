import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readWorkspaceFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

function between(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex, `missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `missing end marker: ${end}`).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("Public API Link analytics security contract", () => {
  const utils = readWorkspaceFile("pocketbase/pb_hooks/utils.js");
  const api = readWorkspaceFile("pocketbase/pb_hooks/api_v1.js");
  const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
  const rollupMigration = readWorkspaceFile(
    "pocketbase/pb_migrations/1784190000_add_analytics_hourly_rollup.js",
  );
  const handler = between(
    api,
    "var readLinkAnalytics = function(c)",
    "var listProfiles = function(c)",
  );

  it("requires a dedicated analytics scope and rate bucket", () => {
    expect(utils).toContain('"analytics:read": true');
    expect(utils).toContain('rateKind === "analytics" ? "analytics" : "read"');
    expect(utils).toContain("plan.apiAnalyticsRatePerMinute");
    expect(utils).toContain('"apiAnalyticsRatePerMinute": 20');
    expect(utils).toContain('"apiAnalyticsRatePerMinute": 60');
    expect(handler).toContain(
      'authenticateApiRequest(c, "analytics:read", "analytics")',
    );
  });

  it("masks missing and foreign-owned Links with the same 404", () => {
    expect(handler).toContain("getOwnedLink($app, auth.user.id, linkId)");
    expect(handler).toContain(
      'errorResponse(c, auth, 404, "not_found", "Link not found.")',
    );
    expect(handler).not.toContain("findRecordById(\"links\"");
  });

  it("reads compact rollups and never exposes individual click rows", () => {
    expect(handler).toContain("FROM analytics_hourly_rollup r");
    expect(api.match(/INDEXED BY idx_analytics_rollup_lookup/g)).toHaveLength(3);
    expect(handler).toContain("analytics_rollup_state");
    expect(handler).not.toMatch(/FROM\s+clicks\b/i);
    expect(handler).not.toContain("user_agent");
    expect(handler).not.toContain('record.get("ip")');
    expect(rollupMigration).toContain(
      "ON analytics_hourly_rollup (link_id, dimension_type, bucket)",
    );
  });

  it("allows only bounded, predefined UTC periods and output sizes", () => {
    expect(api).toContain(
      '"24h": { cutoff: "-23 hours", points: 24, granularity: "hour" }',
    );
    expect(api).toContain(
      '"90d": { cutoff: "-89 days", points: 90, granularity: "day" }',
    );
    expect(handler).toContain("var config = ANALYTICS_PERIODS[period]");
    expect(handler).toContain('400, "invalid_period"');
    expect(api).toContain("ROW_NUMBER() OVER (");
    expect(api).toContain("WHERE rank_order <= 20");
    expect(handler).toContain(
      "queryAnalyticsBreakdowns(db, link.id, config, totalClicks)",
    );
    expect(handler).toContain('timezone: "UTC"');
  });

  it("returns aggregate dimensions but no private Link destination", () => {
    expect(handler).toContain("summary:");
    expect(handler).toContain("unique_clicks");
    expect(handler).toContain("timeseries: series");
    expect(handler).toContain("breakdowns: breakdowns");
    expect(api).toContain("countries: []");
    expect(api).toContain("referrers: []");
    expect(api).toContain("operating_systems: []");
    expect(handler).not.toContain("destination_url");
  });

  it("bounds repeated and high-cardinality analytics work", () => {
    expect(handler).toContain('utils.getAnalyticsCache(cacheKey)');
    expect(handler).toContain('utils.setAnalyticsCache(cacheKey, { data: data, generatedAt: generatedAt }, 30000)');
    expect(handler).toContain("utils.ANALYTICS_INFLIGHT[cacheKey]");
    expect(utils).toContain("keys.length >= 500");
    expect(utils).toContain("keys.length - 449");
  });

  it("registers only the intended owner-scoped read route", () => {
    expect(hook).toContain(
      'routerAdd("GET", "/api/v1/links/{id}/analytics"',
    );
    expect(hook).not.toMatch(
      /routerAdd\("(?:POST|PATCH|PUT|DELETE)", "\/api\/v1\/links\/\{id\}\/analytics"/,
    );
  });
});
