migrate((app) => {
  const apiKeys = app.findCollectionByNameOrId("api_keys");

  if (!apiKeys.fields.getByName("encrypted_secret")) {
    apiKeys.fields.add(new TextField({
      name: "encrypted_secret",
      required: false,
      max: 512,
    }));
    app.save(apiKeys);
  }

  // Agency previously allowed up to five active keys. Keep only the newest
  // active row before enforcing the new one-key-per-account invariant.
  app.db().newQuery(`
    UPDATE api_keys AS current
    SET status = 'revoked',
        revoked_at = datetime('now')
    WHERE current.status = 'active'
      AND EXISTS (
        SELECT 1
        FROM api_keys AS newer
        WHERE newer.user_id = current.user_id
          AND newer.status = 'active'
          AND (
            newer.created > current.created
            OR (newer.created = current.created AND newer.id > current.id)
          )
      )
  `).execute();

  app.db().newQuery(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_one_active_per_user ON api_keys (user_id) WHERE status = 'active'"
  ).execute();
}, (app) => {
  app.db().newQuery(
    "DROP INDEX IF EXISTS idx_api_keys_one_active_per_user"
  ).execute();

  const apiKeys = app.findCollectionByNameOrId("api_keys");
  if (apiKeys.fields.getByName("encrypted_secret")) {
    apiKeys.fields.removeByName("encrypted_secret");
    app.save(apiKeys);
  }
});
