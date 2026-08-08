migrate((app) => {
  // Shared, restart-safe API rate buckets. Public API authentication fails
  // closed if this table cannot be updated.
  app.db().newQuery(`
    CREATE TABLE IF NOT EXISTS api_rate_limits (
      bucket_key TEXT PRIMARY KEY NOT NULL,
      window_start INTEGER NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0,
      updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute();

  // POST retries are deduplicated per credential and endpoint. The request
  // hash prevents reusing the same idempotency key with a different payload.
  app.db().newQuery(`
    CREATE TABLE IF NOT EXISTS api_idempotency (
      api_key_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (api_key_id, endpoint, idempotency_key),
      FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
    )
  `).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_api_idempotency_created ON api_idempotency (created)"
  ).execute();

  // Separate daily safety ceilings prevent a single paid credential from
  // turning "unlimited" product usage into unbounded SQLite/storage growth.
  app.db().newQuery(`
    CREATE TABLE IF NOT EXISTS api_usage_daily (
      user_id TEXT NOT NULL,
      usage_date TEXT NOT NULL,
      write_count INTEGER NOT NULL DEFAULT 0,
      create_count INTEGER NOT NULL DEFAULT 0,
      updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, usage_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_api_usage_daily_updated ON api_usage_daily (updated)"
  ).execute();

  // Mutation audit rows contain no request body, destination URL, IP address,
  // API secret, or other customer content. They are operational metadata only.
  app.db().newQuery(`
    CREATE TABLE IF NOT EXISTS api_mutation_audit (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      api_key_id TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL DEFAULT '',
      response_status INTEGER NOT NULL,
      request_id TEXT NOT NULL,
      created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_api_mutation_audit_user_created ON api_mutation_audit (user_id, created DESC)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_api_mutation_audit_request ON api_mutation_audit (request_id)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_api_mutation_audit_created ON api_mutation_audit (created)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_api_rate_limits_updated ON api_rate_limits (updated)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_api_keys_status_updated_cleanup ON api_keys (status, updated)"
  ).execute();

  // The owner-scoped API lists use these exact access patterns.
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_links_user_created_api ON links (user_id, created DESC, id)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_profiles_user_created_api ON public_profiles (user_id, created DESC, id)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_profile_links_user_profile_order_api ON profile_links (user_id, profile_id, `order`, created)"
  ).execute();

  // Existing keys intentionally remain links:read only. Write/profile access is
  // granted only by an explicit key refresh, avoiding silent privilege growth
  // for credentials that may already be deployed in third-party integrations.
}, (app) => {
  app.db().newQuery("DROP INDEX IF EXISTS idx_api_keys_status_updated_cleanup").execute();
  app.db().newQuery("DROP INDEX IF EXISTS idx_profile_links_user_profile_order_api").execute();
  app.db().newQuery("DROP INDEX IF EXISTS idx_profiles_user_created_api").execute();
  app.db().newQuery("DROP INDEX IF EXISTS idx_links_user_created_api").execute();
  app.db().newQuery("DROP TABLE IF EXISTS api_mutation_audit").execute();
  app.db().newQuery("DROP TABLE IF EXISTS api_usage_daily").execute();
  app.db().newQuery("DROP TABLE IF EXISTS api_idempotency").execute();
  app.db().newQuery("DROP TABLE IF EXISTS api_rate_limits").execute();
});
