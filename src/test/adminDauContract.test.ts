import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin DAU source of truth", () => {
  it("stores one durable activity row per account and UTC day", () => {
    const migration = read(
      "pocketbase/pb_migrations/1787100000_add_user_activity_daily.js",
    );
    const utils = read("pocketbase/pb_hooks/utils.js");

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS user_activity_daily");
    expect(migration).toContain("PRIMARY KEY (user_id, activity_date)");
    expect(migration).toContain("INNER JOIN users u ON u.id = ae.user_id");
    expect(migration).toContain("analytics_backfill");
    expect(utils).toContain("var recordDailyUserActivity = function");
    expect(utils).toContain("ON CONFLICT(user_id, activity_date) DO UPDATE SET");
    expect(utils).toContain("last_seen = excluded.last_seen");
  });

  it("records successful login, refresh, and visible-session activity", () => {
    const hook = read("pocketbase/pb_hooks/main.pb.js");
    const auth = read("src/contexts/AuthContext.tsx");

    expect(hook).toContain('recordDailyUserActivity($app, e.record && e.record.id, "login")');
    expect(hook).toContain('recordDailyUserActivity($app, e.record && e.record.id, "auth_refresh")');
    expect(hook).toContain('recordDailyUserActivity($app, authUser.id, "active_session")');
    expect(auth).toContain('document.visibilityState !== "visible"');
    expect(auth).toContain('document.addEventListener("visibilitychange"');
  });

  it("reads DAU, MAU, trend, and chart data from the daily ledger", () => {
    const hook = read("pocketbase/pb_hooks/main.pb.js");
    const start = hook.indexOf("// 4. DAU / MAU");
    const end = hook.indexOf("// 5. MRR", start);
    const dauBlock = hook.slice(start, end);
    const chartStart = hook.indexOf("var DayDauModel");
    const chartEnd = hook.indexOf("// Map daily users", chartStart);
    const chartBlock = hook.slice(chartStart, chartEnd);

    expect(start).toBeGreaterThan(-1);
    expect(dauBlock).toContain("FROM user_activity_daily");
    expect(dauBlock).not.toContain("FROM analytics_events");
    expect(dauBlock).toContain("first_seen < datetime('now', '-1 days')");
    expect(chartBlock).toContain("FROM user_activity_daily");
    expect(chartBlock).toContain("activity_date as day");
  });
});
