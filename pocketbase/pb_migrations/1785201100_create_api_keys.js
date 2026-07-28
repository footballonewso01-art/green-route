migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  let apiKeys;
  try {
    apiKeys = app.findCollectionByNameOrId("api_keys");
  } catch (error) {
    apiKeys = new Collection({
      id: "pbc_api_keys",
      name: "api_keys",
      type: "base",
      // API keys are deliberately unavailable through PocketBase's generic
      // records API. The custom lifecycle routes never return secret_hash.
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });

    apiKeys.fields.add(new RelationField({
      name: "user_id",
      required: true,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    apiKeys.fields.add(new TextField({
      name: "name",
      required: true,
      min: 1,
      max: 64,
    }));
    apiKeys.fields.add(new TextField({
      name: "key_prefix",
      required: true,
      min: 19,
      max: 32,
      pattern: "^ltk_live_[A-Za-z0-9]+$",
    }));
    apiKeys.fields.add(new TextField({
      name: "secret_hash",
      required: true,
      min: 64,
      max: 64,
      pattern: "^[a-f0-9]{64}$",
    }));
    apiKeys.fields.add(new TextField({
      name: "scopes",
      required: true,
      max: 255,
    }));
    apiKeys.fields.add(new TextField({
      name: "status",
      required: true,
      max: 16,
      pattern: "^(active|revoked)$",
    }));
    apiKeys.fields.add(new TextField({
      name: "expires_at",
      required: false,
      max: 40,
    }));
    apiKeys.fields.add(new TextField({
      name: "last_used_at",
      required: false,
      max: 40,
    }));
    apiKeys.fields.add(new TextField({
      name: "revoked_at",
      required: false,
      max: 40,
    }));
    apiKeys.fields.add(new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    apiKeys.fields.add(new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));
    app.save(apiKeys);
  }

  app.db().newQuery(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (key_prefix)"
  ).execute();
  app.db().newQuery(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (secret_hash)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_api_keys_owner_status ON api_keys (user_id, status, created DESC)"
  ).execute();
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId("api_keys"));
  } catch (error) {
    // Already removed.
  }
});
