migrate((app) => {
  // DAU/MAU must not depend on a lossy browser telemetry stream. This private
  // ledger stores at most one row per account and UTC day and is updated by
  // successful auth/auth-refresh requests plus visible-session heartbeats.
  app.db().newQuery(`
    CREATE TABLE IF NOT EXISTS user_activity_daily (
      user_id TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (user_id, activity_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) WITHOUT ROWID
  `).execute();

  app.db().newQuery(`
    CREATE INDEX IF NOT EXISTS idx_user_activity_daily_date
    ON user_activity_daily (activity_date, user_id)
  `).execute();
  app.db().newQuery(`
    CREATE INDEX IF NOT EXISTS idx_user_activity_daily_last_seen
    ON user_activity_daily (last_seen, user_id)
  `).execute();

  // Preserve the useful history collected before this ledger existed. Joining
  // users prevents stale relation values from violating the foreign key.
  app.db().newQuery(`
    INSERT INTO user_activity_daily (
      user_id,
      activity_date,
      first_seen,
      last_seen,
      source
    )
    SELECT
      ae.user_id,
      date(ae.created),
      min(ae.created),
      max(ae.created),
      'analytics_backfill'
    FROM analytics_events ae
    INNER JOIN users u ON u.id = ae.user_id
    WHERE ae.user_id != ''
    GROUP BY ae.user_id, date(ae.created)
    ON CONFLICT(user_id, activity_date) DO NOTHING
  `).execute();
}, (app) => {
  app.db().newQuery("DROP TABLE IF EXISTS user_activity_daily").execute();
});
