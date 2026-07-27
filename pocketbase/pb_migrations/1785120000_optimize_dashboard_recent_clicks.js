migrate((app) => {
  // Dashboard activity needs the newest few clicks for each of a user's links.
  // The previous global-created index could scan millions of unrelated clicks
  // before finding a low-traffic user's event. This composite index turns each
  // per-link lookup into a bounded ordered seek.
  app.db().newQuery(`
    CREATE INDEX IF NOT EXISTS idx_clicks_link_created
    ON clicks (link_id, created DESC)
  `).execute();
}, (app) => {
  app.db().newQuery("DROP INDEX IF EXISTS idx_clicks_link_created").execute();
});
