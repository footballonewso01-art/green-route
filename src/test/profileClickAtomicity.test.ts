import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

const migration = fs.readFileSync("pocketbase/pb_migrations/1787865000_make_profile_click_rollup_atomic.js", "utf8");
const hooks = fs.readFileSync("pocketbase/pb_hooks/main.pb.js", "utf8");
const reconcileSource = hooks.slice(hooks.indexOf('cronAdd("reconcile_profile_click_rollups"'));
const reconciliation = reconcileSource.match(/\.newQuery\(`([\s\S]*?)`\)/)![1];
const databases: DatabaseSync[] = [];
let temporary: string | undefined;
const setup = (file = ":memory:") => {
  const db = new DatabaseSync(file);
  databases.push(db);
  db.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE users(id TEXT PRIMARY KEY);
    CREATE TABLE public_profiles (id TEXT PRIMARY KEY);
    CREATE TABLE links (id TEXT PRIMARY KEY);
    CREATE TABLE clicks (id TEXT PRIMARY KEY, source_profile_id TEXT, profile_link_id TEXT, link_id TEXT, created TEXT, is_unique INTEGER);
    CREATE INDEX idx_clicks_created ON clicks(created);
    CREATE TABLE profile_click_hourly_rollup (
      profile_id TEXT REFERENCES public_profiles(id) ON DELETE CASCADE,
      profile_link_id TEXT, link_id TEXT REFERENCES links(id) ON DELETE CASCADE,
      bucket TEXT, total INTEGER, unique_count INTEGER,
      PRIMARY KEY(profile_id,profile_link_id,link_id,bucket));
    INSERT INTO public_profiles VALUES ('profile');
    INSERT INTO links VALUES ('link');
  `);
  vm.runInNewContext(migration, {
    migrate: (up: (app: object) => void) => up({
      db: () => ({ newQuery: (sql: string) => ({ execute: () => db.exec(sql) }) }),
    }),
  });
  vm.runInNewContext(fs.readFileSync("pocketbase/pb_migrations/1788610000_add_stats_adjustments.js", "utf8"), {
    migrate: (up: (app: object) => void) => up({ db: () => ({ newQuery: (sql: string) => ({ execute: () => db.exec(sql) }) }) }),
  });
  return db;
};
const insert = (db: DatabaseSync, id: string, profile = "profile", unique = 1) => db.prepare(`
  INSERT INTO clicks VALUES (?,?,'card','link',strftime('%Y-%m-%d %H:%M:%fZ','now'),?)
`).run(id, profile, unique);
const totals = (db: DatabaseSync) => db.prepare("SELECT sum(total) AS total,sum(unique_count) AS uniq FROM profile_click_hourly_rollup").get();

afterEach(() => {
  for (const db of databases.splice(0).reverse()) db.close();
  if (temporary) {
    expect(temporary.startsWith(path.join(os.tmpdir(), "linktery-rollup-"))).toBe(true);
    fs.rmSync(temporary, { recursive: true, force: true });
    temporary = undefined;
  }
});

describe("atomic profile click counters", () => {
  it("preserves applied adjustment deltas during repeated reconciliation and missing-row repair", () => {
    const db = setup(); insert(db, "real");
    db.exec(`INSERT INTO users VALUES('owner');
      INSERT INTO stats_adjustments(id,user_id,actor_id,state,mode,resource_id,start_at,end_at,reason,config,summary,fingerprint,created)
      VALUES('adjustment','owner','admin','applied','links','link','','','test','{}','{}','','');
      INSERT INTO stats_adjustment_rows SELECT 'adjustment','card','link','profile','card',bucket,'all','',99,79 FROM profile_click_hourly_rollup;
      UPDATE profile_click_hourly_rollup SET total=100,unique_count=80;`);
    db.exec(reconciliation); db.exec(reconciliation);
    expect(totals(db)).toEqual({ total: 100, uniq: 80 });
    db.exec("DELETE FROM profile_click_hourly_rollup"); db.exec(reconciliation);
    expect(totals(db)).toEqual({ total: 100, uniq: 80 });
    db.exec("UPDATE stats_adjustments SET state='reverted'"); db.exec(reconciliation);
    expect(totals(db)).toEqual({ total: 1, uniq: 1 });
  });
  it("increments once at insertion, and repeated reconciliation cannot double count", () => {
    const db = setup();
    insert(db, "one");
    expect(totals(db)).toEqual({ total: 1, uniq: 1 });
    db.exec(reconciliation);
    insert(db, "two", "profile", 0);
    db.exec(reconciliation);
    db.exec(reconciliation);
    expect(totals(db)).toEqual({ total: 2, uniq: 1 });
    const afterSuccess = hooks.slice(hooks.indexOf("// Universal click counter incrementer"), hooks.indexOf("// SECURITY HOOKS (Patches"));
    expect(afterSuccess).not.toContain("INSERT INTO profile_click_hourly_rollup");
  });

  it("rolls back the counter with its event and ignores unattributed clicks", () => {
    const db = setup();
    db.exec("BEGIN");
    insert(db, "rollback");
    db.exec("ROLLBACK");
    expect(totals(db).total).toBeNull();
    insert(db, "plain", "");
    insert(db, "removed", "missing-profile");
    expect(totals(db).total).toBeNull();
    insert(db, "real");
    expect(() => insert(db, "real")).toThrow();
    expect(totals(db)).toEqual({ total: 1, uniq: 1 });
  });

  it("repairs existing excess or missing counts without changing raw events", () => {
    const db = setup();
    insert(db, "one");
    db.exec("UPDATE profile_click_hourly_rollup SET total=5,unique_count=4");
    db.exec(reconciliation);
    expect(totals(db)).toEqual({ total: 1, uniq: 1 });
    db.exec("DELETE FROM profile_click_hourly_rollup");
    db.exec(reconciliation);
    expect(totals(db)).toEqual({ total: 1, uniq: 1 });
    expect(db.prepare("SELECT count(*) AS count FROM clicks").get().count).toBe(1);
  });

  it("prevents another writer from reconciling between event and counter commit", () => {
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), "linktery-rollup-"));
    const file = path.join(temporary, "test.db");
    const writer = setup(file);
    writer.exec("PRAGMA journal_mode=WAL");
    const maintenance = new DatabaseSync(file);
    databases.push(maintenance);
    maintenance.exec("PRAGMA busy_timeout=5");
    writer.exec("BEGIN IMMEDIATE");
    insert(writer, "concurrent");
    // A second connection sees neither uncommitted row nor uncommitted count.
    expect(maintenance.prepare("SELECT count(*) AS count FROM clicks").get().count).toBe(0);
    expect(totals(maintenance).total).toBeNull();
    expect(() => maintenance.exec(reconciliation)).toThrow(/locked/);
    writer.exec("COMMIT");
    maintenance.exec(reconciliation);
    expect(totals(maintenance)).toEqual({ total: 1, uniq: 1 });
  });
});
