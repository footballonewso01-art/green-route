migrate((app) => {
  const promocodes = app.findCollectionByNameOrId("promocodes");

  const campaigns = new Collection({
    id: "pbc_mkt_campaigns",
    name: "marketing_campaigns",
    type: "base",
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'",
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });
  campaigns.fields.add(new TextField({ name: "name", required: true, min: 2, max: 120 }));
  campaigns.fields.add(new TextField({
    name: "tracking_key",
    required: true,
    min: 8,
    max: 64,
    pattern: "^[a-z0-9_-]+$",
  }));
  campaigns.fields.add(new TextField({ name: "objective", required: true, max: 24 }));
  campaigns.fields.add(new TextField({ name: "status", required: true, max: 16 }));
  campaigns.fields.add(new TextField({ name: "landing_path", required: true, max: 160 }));
  campaigns.fields.add(new RelationField({
    name: "promocode_id",
    required: false,
    collectionId: promocodes.id,
    maxSelect: 1,
    cascadeDelete: false,
  }));
  campaigns.fields.add(new NumberField({
    name: "budget_cents",
    required: false,
    min: 0,
    max: 1000000000,
    onlyInt: true,
  }));
  campaigns.fields.add(new TextField({ name: "currency", required: true, min: 3, max: 3 }));
  campaigns.fields.add(new Field({ name: "starts_at", type: "date", required: false }));
  campaigns.fields.add(new Field({ name: "ends_at", type: "date", required: false }));
  campaigns.fields.add(new TextField({ name: "notes", required: false, max: 1000 }));
  campaigns.fields.add(new AutodateField({ name: "created", onCreate: true, onUpdate: false }));
  campaigns.fields.add(new AutodateField({ name: "updated", onCreate: true, onUpdate: true }));
  app.save(campaigns);

  const placements = new Collection({
    id: "pbc_mkt_places",
    name: "marketing_placements",
    type: "base",
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'",
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });
  placements.fields.add(new RelationField({
    name: "campaign_id",
    required: true,
    collectionId: campaigns.id,
    maxSelect: 1,
    cascadeDelete: true,
  }));
  placements.fields.add(new TextField({ name: "name", required: true, min: 2, max: 120 }));
  placements.fields.add(new TextField({
    name: "tracking_slug",
    required: true,
    min: 8,
    max: 40,
    pattern: "^[a-z0-9_-]+$",
  }));
  placements.fields.add(new TextField({
    name: "content_key",
    required: true,
    min: 8,
    max: 64,
    pattern: "^[a-z0-9_-]+$",
  }));
  placements.fields.add(new TextField({ name: "source", required: true, max: 64 }));
  placements.fields.add(new TextField({ name: "medium", required: true, max: 64 }));
  placements.fields.add(new TextField({ name: "landing_path", required: false, max: 160 }));
  placements.fields.add(new NumberField({
    name: "cost_cents",
    required: false,
    min: 0,
    max: 1000000000,
    onlyInt: true,
  }));
  placements.fields.add(new BoolField({ name: "is_active", required: false }));
  placements.fields.add(new TextField({ name: "notes", required: false, max: 500 }));
  placements.fields.add(new AutodateField({ name: "created", onCreate: true, onUpdate: false }));
  placements.fields.add(new AutodateField({ name: "updated", onCreate: true, onUpdate: true }));
  app.save(placements);

  if (!promocodes.fields.getByName("owner_type")) {
    promocodes.fields.add(new TextField({ name: "owner_type", required: false, max: 16 }));
  }
  if (!promocodes.fields.getByName("campaign_id")) {
    promocodes.fields.add(new RelationField({
      name: "campaign_id",
      required: false,
      collectionId: campaigns.id,
      maxSelect: 1,
      cascadeDelete: false,
    }));
  }
  app.save(promocodes);

  app.db().newQuery("UPDATE promocodes SET owner_type = 'partner' WHERE partner_id != '' AND owner_type = ''").execute();
  app.db().newQuery("UPDATE promocodes SET owner_type = 'legacy' WHERE partner_id = '' AND owner_type = ''").execute();
  app.db().newQuery("CREATE UNIQUE INDEX idx_marketing_campaign_tracking_key ON marketing_campaigns (tracking_key)").execute();
  app.db().newQuery("CREATE UNIQUE INDEX idx_marketing_placement_tracking_slug ON marketing_placements (tracking_slug)").execute();
  app.db().newQuery("CREATE UNIQUE INDEX idx_marketing_placement_content_key ON marketing_placements (content_key)").execute();
  app.db().newQuery("CREATE INDEX idx_marketing_placements_campaign ON marketing_placements (campaign_id, created)").execute();

  // Private, server-written visit ledger. It deliberately does not share the
  // links/clicks tables used by customer analytics.
  app.db().newQuery(`
    CREATE TABLE marketing_campaign_visits (
      id TEXT PRIMARY KEY NOT NULL,
      campaign_id TEXT NOT NULL,
      placement_id TEXT NOT NULL,
      journey_id TEXT NOT NULL DEFAULT '',
      visitor_key TEXT NOT NULL,
      traffic_quality TEXT NOT NULL DEFAULT 'human',
      created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ', 'now')),
      FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (placement_id) REFERENCES marketing_placements(id) ON DELETE CASCADE
    ) WITHOUT ROWID
  `).execute();
  app.db().newQuery(`
    CREATE INDEX idx_marketing_visits_campaign_created
    ON marketing_campaign_visits (campaign_id, created, traffic_quality)
  `).execute();
  app.db().newQuery(`
    CREATE INDEX idx_marketing_visits_placement_created
    ON marketing_campaign_visits (placement_id, created, traffic_quality)
  `).execute();
}, (app) => {
  app.db().newQuery("DROP TABLE IF EXISTS marketing_campaign_visits").execute();
  app.db().newQuery("DROP INDEX IF EXISTS idx_marketing_placements_campaign").execute();
  app.db().newQuery("DROP INDEX IF EXISTS idx_marketing_placement_content_key").execute();
  app.db().newQuery("DROP INDEX IF EXISTS idx_marketing_placement_tracking_slug").execute();
  app.db().newQuery("DROP INDEX IF EXISTS idx_marketing_campaign_tracking_key").execute();

  const promocodes = app.findCollectionByNameOrId("promocodes");
  if (promocodes.fields.getByName("campaign_id")) promocodes.fields.removeByName("campaign_id");
  if (promocodes.fields.getByName("owner_type")) promocodes.fields.removeByName("owner_type");
  app.save(promocodes);

  app.delete(app.findCollectionByNameOrId("marketing_placements"));
  app.delete(app.findCollectionByNameOrId("marketing_campaigns"));
});
