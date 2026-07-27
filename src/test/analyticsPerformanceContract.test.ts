import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readWorkspaceFile = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("analytics performance contract", () => {
  it("serves customer analytics from hourly rollups instead of raw clicks", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const statsStart = hook.indexOf('routerAdd("GET", "/api/analytics/stats"');
    const statsEnd = hook.indexOf('routerAdd("GET", "/api/analytics/recent"');
    const statsRoute = hook.slice(statsStart, statsEnd);

    expect(statsStart).toBeGreaterThan(-1);
    expect(statsRoute).toContain("FROM analytics_hourly_rollup");
    expect(statsRoute).not.toContain("FROM clicks");
    expect(statsRoute).toContain("dimension_type");
    expect(statsRoute).toContain("analytics_rollup_state");
    expect(statsRoute).toContain("plan.analytics");
    expect(statsRoute).toContain("ANALYTICS_INFLIGHT");
    expect(statsRoute).toContain("getAnalyticsCache");
  });

  it("keeps recent activity bounded and separate from aggregate stats", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const recentStart = hook.indexOf('routerAdd("GET", "/api/analytics/recent"');
    const recentEnd = hook.indexOf('routerAdd("GET", "/api/links/sparklines"');
    const recentRoute = hook.slice(recentStart, recentEnd);

    expect(recentRoute).toContain("ORDER BY c.created DESC LIMIT 5");
    expect(recentRoute).not.toContain("count(");

    const page = readWorkspaceFile("src/pages/AnalyticsPage.tsx");
    expect(page).toContain("/api/analytics/recent");
    expect(page).not.toContain("collection('clicks').getList<ClickRecord>");
  });

  it("does not download raw click pages for Links sparklines or Dashboard", () => {
    const links = readWorkspaceFile("src/pages/LinksManager.tsx");
    const dashboard = readWorkspaceFile("src/pages/DashboardHome.tsx");

    expect(links).toContain("/api/links/sparklines");
    expect(links).not.toContain("while (hasMore)");
    expect(dashboard).toContain("/api/dashboard/summary");
    expect(dashboard).toContain("/api/dashboard/recent");
    expect(dashboard).not.toContain("collection('clicks').getList");
  });

  it("keeps Dashboard metrics independent and bounds recent-click work per link", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const summaryStart = hook.indexOf('routerAdd("GET", "/api/dashboard/summary"');
    const recentStart = hook.indexOf('routerAdd("GET", "/api/dashboard/recent"');
    const adminStart = hook.indexOf("// Admin Dashboard telemetry", recentStart);
    const summaryRoute = hook.slice(summaryStart, recentStart);
    const recentRoute = hook.slice(recentStart, adminStart);

    expect(summaryRoute).not.toContain("FROM clicks");
    expect(summaryRoute).toContain("FROM analytics_hourly_rollup");
    expect(recentRoute).toContain("idx_clicks_link_created");
    expect(recentRoute).toContain("ORDER BY c.created DESC LIMIT 5");
    expect(recentRoute).toContain('perLinkQueries.join(" UNION ALL ")');

    const migration = readWorkspaceFile("pocketbase/pb_migrations/1785120000_optimize_dashboard_recent_clicks.js");
    expect(migration).toContain("idx_clicks_link_created");
    expect(migration).toContain("link_id, created DESC");
  });

  it("persists the production machine size needed for the SQLite working set", () => {
    const flyConfig = readWorkspaceFile("pocketbase/fly.toml");

    expect(flyConfig).toContain("memory = '4gb'");
    expect(flyConfig).toContain("cpus = 2");
    expect(flyConfig).toContain("memory_mb = 4096");
  });

  it("keeps startup migration constant-time and historical backfill resumable", () => {
    const migration = readWorkspaceFile("pocketbase/pb_migrations/1784190000_add_analytics_hourly_rollup.js");
    const backfill = readWorkspaceFile("pocketbase/backfill_analytics_rollup.py");

    expect(migration).not.toContain("count(id)");
    expect(migration).toContain("max(rowid)");
    expect(migration).toContain("'pending'");
    expect(backfill).toContain("BEGIN IMMEDIATE");
    expect(backfill).toContain("last_stage_id");
    expect(backfill).toContain("dimension_type");
  });
});
