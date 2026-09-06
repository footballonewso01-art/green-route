// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

describe("growth acquisition SQL integration", () => {
  it("migrates, joins late signup enrichment to server activation, and rolls back", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES ('user1234567890'); CREATE TABLE analytics_events(id TEXT, user_id TEXT, event_name TEXT, created TEXT)");
    const app = { db: () => ({ newQuery: (sql: string) => {
      let bindings: Record<string, unknown> = {};
      const query = { bind: (params: Record<string, unknown>) => { bindings = params; return query; }, execute: () => {
        const normalized = sql.replace(/\{:(\w+)\}/g, ":$1");
        const stmt = db.prepare(normalized);
        if (Object.keys(bindings).length) stmt.run(bindings as never); else stmt.run();
      } };
      return query;
    } }) };
    const migrations = ["1787456000_add_growth_funnel.js", "1788600000_add_growth_landing_attribution.js"];
    const downs: ((app: unknown) => void)[] = [];
    for (const name of migrations) vm.runInNewContext(readFileSync(`pocketbase/pb_migrations/${name}`, "utf8"), { migrate: (up: (app: unknown) => void, down: (app: unknown) => void) => { up(app); downs.push(down); } });
    const context = { module: { exports: {} as { recordGrowthEvent: (app: unknown, options: Record<string, unknown>) => void } } };
    vm.runInNewContext(readFileSync("pocketbase/pb_hooks/utils.js", "utf8"), context);
    const record = (options: Record<string, unknown>) => context.module.exports.recordGrowthEvent(app, { userId: "user1234567890", ...options });
    record({ id: "signup:user1234567890", eventName: "signup_completed" });
    record({ id: "profile-created:1234567890", eventName: "profile_created" });
    record({ id: "signup:user1234567890", eventName: "signup_completed", landingPath: "/guides/how-to-track-link-clicks?secret=1", path: "/register?password=1", source: "google.com", medium: "organic" });
    record({ id: "signup:user1234567890", eventName: "signup_completed", landingPath: "/pricing", source: "bing.com", medium: "cpc" });
    const result = db.prepare("SELECT * FROM growth_acquisition_funnel").get();
    expect(result).toMatchObject({ source: "google.com", medium: "organic", landing_path: "/guides/how-to-track-link-clicks", first_link_at: null });
    expect(result!.first_profile_at).toBeTruthy();
    expect(db.prepare("SELECT count(*) AS n FROM growth_acquisition_funnel").get()!.n).toBe(1);
    expect(db.prepare("SELECT path FROM growth_events WHERE event_name = 'signup_completed'").get()!.path).toBe("/register");
    downs[1](app);
    expect(db.prepare("PRAGMA table_info(growth_events)").all().map((row) => row.name)).not.toContain("landing_path");
    db.close();
  });
});
