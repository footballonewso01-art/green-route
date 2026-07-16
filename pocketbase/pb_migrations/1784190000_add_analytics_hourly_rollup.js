migrate((app) => {
  const db = app.db();

  // Keep startup migrations strictly O(1). Historical aggregation is performed
  // by backfill_analytics_rollup.py while PocketBase is already serving traffic.
  // This prevents a multi-million-row GROUP BY from blocking redirects on boot.
  db.newQuery(`
    CREATE TABLE IF NOT EXISTS analytics_hourly_rollup (
      link_id TEXT NOT NULL,
      bucket TEXT NOT NULL,
      dimension_type TEXT NOT NULL,
      dimension_value TEXT NOT NULL,
      total INTEGER NOT NULL DEFAULT 0,
      unique_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (link_id, bucket, dimension_type, dimension_value),
      FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
    ) WITHOUT ROWID
  `).execute();

  db.newQuery(`
    CREATE INDEX IF NOT EXISTS idx_analytics_rollup_lookup
    ON analytics_hourly_rollup (link_id, dimension_type, bucket)
  `).execute();

  db.newQuery(`
    CREATE TABLE IF NOT EXISTS analytics_rollup_state (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      max_click_rowid INTEGER NOT NULL DEFAULT 0,
      last_stage_id INTEGER NOT NULL DEFAULT 0,
      updated TEXT NOT NULL
    ) WITHOUT ROWID
  `).execute();

  // rowid is captured before the HTTP server starts. Clicks created after this
  // point are written by the live hook; the backfill handles only this fixed
  // historical range, so the two streams cannot double-count each other.
  db.newQuery(`
    INSERT INTO analytics_rollup_state (
      id, status, max_click_rowid, last_stage_id, updated
    )
    VALUES (
      'historical', 'pending', COALESCE((SELECT max(rowid) FROM clicks), 0), 0, datetime('now')
    )
    ON CONFLICT(id) DO NOTHING
  `).execute();

  console.log("Migration: analytics hourly rollup schema created; historical backfill pending");
}, (app) => {
  const db = app.db();
  db.newQuery("DROP TABLE IF EXISTS analytics_rollup_state").execute();
  db.newQuery("DROP TABLE IF EXISTS analytics_hourly_rollup").execute();
});
