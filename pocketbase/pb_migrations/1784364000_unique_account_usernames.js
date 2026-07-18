migrate((app) => {
  // Account usernames are internal Linktery identifiers. Normalize historical
  // values before enforcing case-insensitive uniqueness.
  app.db().newQuery(
    "UPDATE users SET username = lower(trim(username)) WHERE username != ''"
  ).execute();

  // Older client-only checks allowed one race-condition duplicate. Preserve
  // the oldest account and give later duplicates a deterministic unique suffix.
  app.db().newQuery(`
    WITH ranked AS (
      SELECT
        id,
        row_number() OVER (
          PARTITION BY lower(username)
          ORDER BY verified DESC, created ASC, id ASC
        ) AS duplicate_rank
      FROM users
      WHERE username != ''
    )
    UPDATE users
    SET username = substr(username, 1, 17) || '_' || substr(id, -4)
    WHERE id IN (
      SELECT id FROM ranked WHERE duplicate_rank > 1
    )
  `).execute();

  // The legacy account name is derived from Username. Public Profile display
  // names live in public_profiles and are intentionally unaffected.
  app.db().newQuery(
    "UPDATE users SET name = username WHERE username != ''"
  ).execute();

  app.db().newQuery(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_nocase ON users (lower(username)) WHERE username != ''"
  ).execute();
}, (app) => {
  app.db().newQuery(
    "DROP INDEX IF EXISTS idx_users_username_nocase"
  ).execute();
});
