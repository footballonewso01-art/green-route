migrate((app) => {
  app.db().newQuery(`
    CREATE TABLE IF NOT EXISTS profile_slug_reservations (
      slug TEXT PRIMARY KEY COLLATE NOCASE NOT NULL,
      token_hash TEXT NOT NULL,
      journey_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ', 'now')),
      updated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ', 'now'))
    ) WITHOUT ROWID
  `).execute();
  app.db().newQuery(`
    CREATE INDEX IF NOT EXISTS idx_profile_slug_reservations_expiry
    ON profile_slug_reservations (expires_at)
  `).execute();

  // A live onboarding reservation has the same authority as an existing
  // public slug. Claiming deletes it inside the profile-create transaction.
  for (const statement of [
    `CREATE TRIGGER IF NOT EXISTS block_reserved_profile_slug_insert
       BEFORE INSERT ON public_profiles
       WHEN EXISTS (SELECT 1 FROM profile_slug_reservations r WHERE r.slug = lower(NEW.slug) AND r.expires_at > datetime('now'))
       BEGIN SELECT RAISE(ABORT, 'This public address is temporarily reserved'); END`,
    `CREATE TRIGGER IF NOT EXISTS block_reserved_profile_slug_update
       BEFORE UPDATE OF slug ON public_profiles
       WHEN EXISTS (SELECT 1 FROM profile_slug_reservations r WHERE r.slug = lower(NEW.slug) AND r.expires_at > datetime('now'))
       BEGIN SELECT RAISE(ABORT, 'This public address is temporarily reserved'); END`,
    `CREATE TRIGGER IF NOT EXISTS block_reserved_link_slug_insert
       BEFORE INSERT ON links
       WHEN EXISTS (SELECT 1 FROM profile_slug_reservations r WHERE r.slug = lower(NEW.slug) AND r.expires_at > datetime('now'))
       BEGIN SELECT RAISE(ABORT, 'This public address is temporarily reserved'); END`,
    `CREATE TRIGGER IF NOT EXISTS block_reserved_link_slug_update
       BEFORE UPDATE OF slug ON links
       WHEN EXISTS (SELECT 1 FROM profile_slug_reservations r WHERE r.slug = lower(NEW.slug) AND r.expires_at > datetime('now'))
       BEGIN SELECT RAISE(ABORT, 'This public address is temporarily reserved'); END`,
  ]) app.db().newQuery(statement).execute();
}, (app) => {
  for (const trigger of [
    "block_reserved_profile_slug_insert",
    "block_reserved_profile_slug_update",
    "block_reserved_link_slug_insert",
    "block_reserved_link_slug_update",
  ]) app.db().newQuery("DROP TRIGGER IF EXISTS " + trigger).execute();
  app.db().newQuery("DROP TABLE IF EXISTS profile_slug_reservations").execute();
});
