migrate((app) => {
  for (const name of ["analytics_events", "system_logs", "api_keys", "clicks"]) {
    const collection = app.findCollectionByNameOrId(name);
    collection.listRule = null;
    collection.viewRule = null;
    collection.createRule = null;
    collection.updateRule = null;
    collection.deleteRule = null;
    app.save(collection);
  }

  // Fly removes any client-supplied value and injects Fly-Client-IP at its
  // edge. This makes PocketBase realIP() account for the trusted proxy instead
  // of grouping every registration/promocode request under a Fly proxy IP.
  app.db().newQuery(`
    UPDATE _params
    SET value = json_set(
          value,
          '$.trustedProxy.headers', json_array('Fly-Client-IP'),
          '$.trustedProxy.useLeftmostIP', json('false')
        ),
        updated = datetime('now')
    WHERE id = 'settings'
  `).execute();
}, (app) => {
  // The legacy browser-direct collectors were public create-only. This down
  // migration restores compatibility for rollback, but the forward migration
  // and trusted custom endpoint are the secure production state.
  for (const name of ["analytics_events", "system_logs"]) {
    const collection = app.findCollectionByNameOrId(name);
    collection.createRule = "";
    app.save(collection);
  }
  // Trusted proxy hardening is intentionally retained on application rollback.
});
