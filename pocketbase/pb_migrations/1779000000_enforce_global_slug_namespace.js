migrate((app) => {
  // A unique index cannot span two tables. These triggers make the public URL
  // namespace transactional: a slug belongs to either a smart link or a public
  // profile, never both. They also cover direct API calls and concurrent creates.
  try {
    app.db().newQuery("DROP TRIGGER IF EXISTS prevent_link_slug_profile_collision_on_insert").execute();
    app.db().newQuery("DROP TRIGGER IF EXISTS prevent_link_slug_profile_collision_on_update").execute();
    app.db().newQuery("DROP TRIGGER IF EXISTS prevent_profile_slug_link_collision_on_insert").execute();
    app.db().newQuery("DROP TRIGGER IF EXISTS prevent_profile_slug_link_collision_on_update").execute();

    app.db().newQuery(`
      CREATE TRIGGER prevent_link_slug_profile_collision_on_insert
      BEFORE INSERT ON links
      WHEN NEW.slug IS NOT NULL
        AND NEW.slug != ''
        AND EXISTS (SELECT 1 FROM public_profiles WHERE slug = NEW.slug)
      BEGIN
        SELECT RAISE(ABORT, 'Slug is already used by a public profile');
      END
    `).execute();

    app.db().newQuery(`
      CREATE TRIGGER prevent_link_slug_profile_collision_on_update
      BEFORE UPDATE OF slug ON links
      WHEN NEW.slug IS NOT NULL
        AND NEW.slug != ''
        AND EXISTS (SELECT 1 FROM public_profiles WHERE slug = NEW.slug)
      BEGIN
        SELECT RAISE(ABORT, 'Slug is already used by a public profile');
      END
    `).execute();

    app.db().newQuery(`
      CREATE TRIGGER prevent_profile_slug_link_collision_on_insert
      BEFORE INSERT ON public_profiles
      WHEN NEW.slug IS NOT NULL
        AND NEW.slug != ''
        AND EXISTS (SELECT 1 FROM links WHERE slug = NEW.slug)
      BEGIN
        SELECT RAISE(ABORT, 'Slug is already used by a smart link');
      END
    `).execute();

    app.db().newQuery(`
      CREATE TRIGGER prevent_profile_slug_link_collision_on_update
      BEFORE UPDATE OF slug ON public_profiles
      WHEN NEW.slug IS NOT NULL
        AND NEW.slug != ''
        AND EXISTS (SELECT 1 FROM links WHERE slug = NEW.slug)
      BEGIN
        SELECT RAISE(ABORT, 'Slug is already used by a smart link');
      END
    `).execute();

    console.log("Created global slug namespace triggers for links and public_profiles");
  } catch (err) {
    console.error("FAILED to create global slug namespace triggers:", err);
    throw err;
  }
}, (app) => {
  app.db().newQuery("DROP TRIGGER IF EXISTS prevent_link_slug_profile_collision_on_insert").execute();
  app.db().newQuery("DROP TRIGGER IF EXISTS prevent_link_slug_profile_collision_on_update").execute();
  app.db().newQuery("DROP TRIGGER IF EXISTS prevent_profile_slug_link_collision_on_insert").execute();
  app.db().newQuery("DROP TRIGGER IF EXISTS prevent_profile_slug_link_collision_on_update").execute();
});
