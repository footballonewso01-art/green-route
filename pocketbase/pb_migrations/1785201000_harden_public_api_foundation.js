migrate((app) => {
  // Keep the effective production access policy reproducible from source.
  // Custom server routes use app.save() and are not constrained by collection
  // API rules, so ingestion and billing remain available without exposing raw
  // mutation endpoints to browser/API clients.
  const users = app.findCollectionByNameOrId("users");
  users.listRule = "id = @request.auth.id || @request.auth.role = 'admin'";
  users.viewRule = "id = @request.auth.id || @request.auth.role = 'admin'";
  users.createRule = "";
  users.updateRule = "id = @request.auth.id || @request.auth.role = 'admin'";
  users.deleteRule = "id = @request.auth.id || @request.auth.role = 'admin'";
  app.save(users);

  const billing = app.findCollectionByNameOrId("billing");
  billing.listRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  billing.viewRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  billing.createRule = "@request.auth.role = 'admin'";
  billing.updateRule = "@request.auth.role = 'admin'";
  billing.deleteRule = "@request.auth.role = 'admin'";
  app.save(billing);

  const clicks = app.findCollectionByNameOrId("clicks");
  clicks.listRule = null;
  clicks.viewRule = null;
  clicks.createRule = null;
  clicks.updateRule = null;
  clicks.deleteRule = null;
  app.save(clicks);

  const links = app.findCollectionByNameOrId("links");
  links.listRule = "";
  links.viewRule = "";
  links.createRule = "@request.auth.id != '' && (@request.auth.id = user_id || @request.auth.role = 'admin')";
  links.updateRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  links.deleteRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  app.save(links);

  const profiles = app.findCollectionByNameOrId("public_profiles");
  profiles.listRule = "";
  profiles.viewRule = "";
  // PB 0.24 cannot reliably evaluate a newly assigned relation in createRule.
  // The create hook always overwrites/validates user_id before persistence.
  profiles.createRule = "@request.auth.id != ''";
  profiles.updateRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  profiles.deleteRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  app.save(profiles);

  const profileLinks = app.findCollectionByNameOrId("profile_links");
  profileLinks.listRule = "visible = true || @request.auth.id = user_id || @request.auth.role = 'admin'";
  profileLinks.viewRule = "visible = true || @request.auth.id = user_id || @request.auth.role = 'admin'";
  profileLinks.createRule = "@request.auth.id != '' && (@request.auth.id = user_id || @request.auth.role = 'admin')";
  profileLinks.updateRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  profileLinks.deleteRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  app.save(profileLinks);

  // A system route must never become an unreachable Link/Profile slug, even
  // through an internal script that doesn't execute request hooks.
  const reserved = [
    "404", "admin", "alternatives", "api", "assets", "auth", "cdn-cgi",
    "compare", "dashboard", "features", "guides", "login", "open-in-browser",
    "pricing", "privacy", "ref", "register", "solutions", "templates",
    "terms", "tools"
  ];
  const reservedSql = reserved.map((value) => "'" + value + "'").join(",");

  app.db().newQuery("DROP TRIGGER IF EXISTS prevent_reserved_link_slug_on_insert").execute();
  app.db().newQuery("DROP TRIGGER IF EXISTS prevent_reserved_link_slug_on_update").execute();
  app.db().newQuery("DROP TRIGGER IF EXISTS prevent_reserved_profile_slug_on_insert").execute();
  app.db().newQuery("DROP TRIGGER IF EXISTS prevent_reserved_profile_slug_on_update").execute();

  app.db().newQuery(`
    CREATE TRIGGER prevent_reserved_link_slug_on_insert
    BEFORE INSERT ON links
    WHEN lower(NEW.slug) IN (${reservedSql})
    BEGIN
      SELECT RAISE(ABORT, 'Slug is reserved for a Linktery system route');
    END
  `).execute();
  app.db().newQuery(`
    CREATE TRIGGER prevent_reserved_link_slug_on_update
    BEFORE UPDATE OF slug ON links
    WHEN lower(NEW.slug) IN (${reservedSql})
    BEGIN
      SELECT RAISE(ABORT, 'Slug is reserved for a Linktery system route');
    END
  `).execute();
  app.db().newQuery(`
    CREATE TRIGGER prevent_reserved_profile_slug_on_insert
    BEFORE INSERT ON public_profiles
    WHEN lower(NEW.slug) IN (${reservedSql})
    BEGIN
      SELECT RAISE(ABORT, 'Slug is reserved for a Linktery system route');
    END
  `).execute();
  app.db().newQuery(`
    CREATE TRIGGER prevent_reserved_profile_slug_on_update
    BEFORE UPDATE OF slug ON public_profiles
    WHEN lower(NEW.slug) IN (${reservedSql})
    BEGIN
      SELECT RAISE(ABORT, 'Slug is reserved for a Linktery system route');
    END
  `).execute();

  // PocketBase's global limiter existed in production settings but was
  // disabled. Preserve the configured rules and activate them.
  app.db().newQuery(`
    UPDATE _params
    SET value = json_set(value, '$.rateLimits.enabled', json('true')),
        updated = datetime('now')
    WHERE id = 'settings'
  `).execute();

  console.log("Applied public API foundation hardening");
}, (app) => {
  // Intentionally non-destructive. Rolling application code back must not
  // silently reopen raw clicks, billing mutations, or reserved system slugs.
  console.log("Public API foundation security policy is intentionally retained on rollback");
});
