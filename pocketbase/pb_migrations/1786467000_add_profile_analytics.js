migrate((app) => {
  const profiles = app.findCollectionByNameOrId("public_profiles");
  const profileLinks = app.findCollectionByNameOrId("profile_links");
  const clicks = app.findCollectionByNameOrId("clicks");

  let events;
  try {
    events = app.findCollectionByNameOrId("profile_view_events");
  } catch (error) {
    events = new Collection({
      id: "pbc_profile_views",
      name: "profile_view_events",
      type: "base",
      // Raw visitor events are server-only. Owners read aggregated analytics
      // through the authenticated custom route instead of the Records API.
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });

    events.fields.add(new RelationField({
      name: "profile_id",
      required: true,
      collectionId: profiles.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    for (const field of [
      ["country", 32],
      ["device", 32],
      ["os", 32],
      ["browser", 32],
      ["referrer", 200],
      ["request_key", 64],
      ["visitor_day", 10],
      ["visitor_hash", 64],
    ]) {
      events.fields.add(new TextField({
        name: field[0],
        required: true,
        max: field[1],
      }));
    }
    events.fields.add(new BoolField({
      name: "is_unique",
      required: false,
    }));
    events.fields.add(new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    events.fields.add(new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));
    app.save(events);
  }

  app.db().newQuery(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_view_request ON profile_view_events (request_key)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_profile_view_profile_created ON profile_view_events (profile_id, created DESC)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_profile_view_created ON profile_view_events (created)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_profile_view_visitor_day ON profile_view_events (profile_id, visitor_day, visitor_hash)"
  ).execute();
  app.db().newQuery(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_view_daily_unique
    ON profile_view_events (profile_id, visitor_day, visitor_hash)
    WHERE is_unique = 1
  `).execute();

  app.db().newQuery(`
    CREATE TABLE IF NOT EXISTS profile_analytics_hourly_rollup (
      profile_id TEXT NOT NULL,
      bucket TEXT NOT NULL,
      dimension_type TEXT NOT NULL,
      dimension_value TEXT NOT NULL,
      total INTEGER NOT NULL DEFAULT 0,
      unique_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (profile_id, bucket, dimension_type, dimension_value),
      FOREIGN KEY (profile_id) REFERENCES public_profiles(id) ON DELETE CASCADE
    ) WITHOUT ROWID
  `).execute();
  app.db().newQuery(`
    CREATE INDEX IF NOT EXISTS idx_profile_analytics_rollup_lookup
    ON profile_analytics_hourly_rollup (profile_id, dimension_type, bucket)
  `).execute();
  app.db().newQuery(`
    CREATE TABLE IF NOT EXISTS profile_click_hourly_rollup (
      profile_id TEXT NOT NULL,
      profile_link_id TEXT NOT NULL,
      link_id TEXT NOT NULL,
      bucket TEXT NOT NULL,
      total INTEGER NOT NULL DEFAULT 0,
      unique_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (profile_id, profile_link_id, link_id, bucket),
      FOREIGN KEY (profile_id) REFERENCES public_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
    ) WITHOUT ROWID
  `).execute();
  app.db().newQuery(`
    CREATE INDEX IF NOT EXISTS idx_profile_click_rollup_lookup
    ON profile_click_hourly_rollup (profile_id, bucket)
  `).execute();

  if (!clicks.fields.getByName("source_profile_id")) {
    clicks.fields.add(new RelationField({
      name: "source_profile_id",
      required: false,
      collectionId: profiles.id,
      maxSelect: 1,
      cascadeDelete: false,
    }));
  }
  if (!clicks.fields.getByName("profile_link_id")) {
    clicks.fields.add(new RelationField({
      name: "profile_link_id",
      required: false,
      collectionId: profileLinks.id,
      maxSelect: 1,
      cascadeDelete: false,
    }));
  }
  app.save(clicks);
}, (app) => {
  app.db().newQuery("DROP TABLE IF EXISTS profile_click_hourly_rollup").execute();
  app.db().newQuery("DROP TABLE IF EXISTS profile_analytics_hourly_rollup").execute();

  try {
    app.delete(app.findCollectionByNameOrId("profile_view_events"));
  } catch (error) {
    // Already removed.
  }

  const clicks = app.findCollectionByNameOrId("clicks");
  if (clicks.fields.getByName("source_profile_id")) clicks.fields.removeByName("source_profile_id");
  if (clicks.fields.getByName("profile_link_id")) clicks.fields.removeByName("profile_link_id");
  app.save(clicks);
});
