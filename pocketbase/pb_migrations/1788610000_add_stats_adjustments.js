migrate((app) => {
  // Private SQL tables: deliberately not PocketBase collections/Records API.
  app.db().newQuery(`CREATE TABLE stats_adjustments (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, actor_id TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('preview','applied','reverted')),
    mode TEXT NOT NULL, resource_id TEXT NOT NULL, start_at TEXT NOT NULL, end_at TEXT NOT NULL,
    reason TEXT NOT NULL, config TEXT NOT NULL, summary TEXT NOT NULL, fingerprint TEXT NOT NULL,
    created TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT '', reverted_at TEXT NOT NULL DEFAULT '',
    reverted_by TEXT NOT NULL DEFAULT '',
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`).execute();
  app.db().newQuery("CREATE INDEX idx_stats_adjustments_user ON stats_adjustments(user_id, created DESC)").execute();
  app.db().newQuery(`CREATE TABLE stats_adjustment_rows (
    adjustment_id TEXT NOT NULL, kind TEXT NOT NULL,
    resource_id TEXT NOT NULL, profile_id TEXT NOT NULL DEFAULT '', card_id TEXT NOT NULL DEFAULT '',
    bucket TEXT NOT NULL, dimension_type TEXT NOT NULL, dimension_value TEXT NOT NULL,
    total INTEGER NOT NULL, unique_count INTEGER NOT NULL,
    PRIMARY KEY(adjustment_id,kind,resource_id,profile_id,card_id,bucket,dimension_type,dimension_value),
    FOREIGN KEY(adjustment_id) REFERENCES stats_adjustments(id) ON DELETE CASCADE
  ) WITHOUT ROWID`).execute();
  app.db().newQuery("CREATE INDEX idx_stats_adjustment_resource ON stats_adjustment_rows(kind,resource_id,bucket,adjustment_id)").execute();
  app.db().newQuery("CREATE TABLE stats_revision (user_id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)").execute();
}, (app) => {
  // Applied adjustments must be undone through the admin API before rollback.
  const row = new DynamicModel({ n: 0 });
  app.db().newQuery("SELECT count(*) AS n FROM stats_adjustments WHERE state='applied'").one(row);
  if (row.n > 0) throw new Error("Revert applied statistics adjustments before rolling back this migration.");
  app.db().newQuery("DROP TABLE stats_adjustment_rows").execute();
  app.db().newQuery("DROP TABLE stats_adjustments").execute();
  app.db().newQuery("DROP TABLE stats_revision").execute();
});
