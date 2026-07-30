migrate((app) => {
  // Cloudflare owns /cdn-cgi/* at the edge. Reserve the one-segment root in
  // PocketBase as well so a new Link or Public Profile can never be created at
  // an address the frontend cannot serve after the CDN migration.
  const resources = [
    ["links", "link"],
    ["public_profiles", "profile"],
  ];

  for (const [table, resource] of resources) {
    for (const operation of ["insert", "update"]) {
      const triggerName =
        `prevent_cloudflare_reserved_${resource}_slug_on_${operation}`;
      const timing =
        operation === "insert" ? "BEFORE INSERT" : "BEFORE UPDATE OF slug";

      app.db().newQuery(`DROP TRIGGER IF EXISTS ${triggerName}`).execute();
      app.db().newQuery(`
        CREATE TRIGGER ${triggerName}
        ${timing} ON ${table}
        WHEN lower(NEW.slug) = 'cdn-cgi'
        BEGIN
          SELECT RAISE(ABORT, 'Slug is reserved for a Linktery system route');
        END
      `).execute();
    }
  }
}, (app) => {
  for (const resource of ["link", "profile"]) {
    for (const operation of ["insert", "update"]) {
      app.db().newQuery(
        `DROP TRIGGER IF EXISTS prevent_cloudflare_reserved_${resource}_slug_on_${operation}`
      ).execute();
    }
  }
});
