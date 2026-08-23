migrate((app) => {
  // Private, server-written product funnel. Keeping this outside PocketBase
  // collections prevents clients from listing or mutating acquisition data.
  app.db().newQuery(`
    CREATE TABLE IF NOT EXISTS growth_events (
      id TEXT PRIMARY KEY NOT NULL,
      event_name TEXT NOT NULL,
      user_id TEXT NULL,
      journey_id TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'direct',
      medium TEXT NOT NULL DEFAULT '',
      campaign TEXT NOT NULL DEFAULT '',
      surface TEXT NOT NULL DEFAULT '',
      target_plan TEXT NOT NULL DEFAULT '',
      object_id TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) WITHOUT ROWID
  `).execute();

  app.db().newQuery(`
    CREATE INDEX IF NOT EXISTS idx_growth_events_name_created
    ON growth_events (event_name, created, user_id)
  `).execute();
  app.db().newQuery(`
    CREATE INDEX IF NOT EXISTS idx_growth_events_user_created
    ON growth_events (user_id, created, event_name)
    WHERE user_id IS NOT NULL
  `).execute();
  app.db().newQuery(`
    CREATE INDEX IF NOT EXISTS idx_growth_events_source_created
    ON growth_events (source, created, event_name)
  `).execute();

  // Preserve the only historical acquisition event that existed before this
  // ledger. Event ids remain deterministic, so the migration is idempotent.
  app.db().newQuery(`
    INSERT OR IGNORE INTO growth_events (
      id, event_name, user_id, journey_id, source, surface, created
    )
    SELECT
      'legacy:' || ae.id,
      'landing_pageview',
      CASE WHEN ae.user_id = '' THEN NULL ELSE ae.user_id END,
      '',
      'unknown',
      'landing',
      ae.created
    FROM analytics_events ae
    WHERE ae.event_name = 'landing_pageview'
  `).execute();
}, (app) => {
  app.db().newQuery("DROP TABLE IF EXISTS growth_events").execute();
});
