migrate((app) => {
  // /documentation is a first-party page in the same one-segment namespace as
  // Links and Public Profiles. Refuse to hide an existing customer resource
  // behind the new route; deployment must resolve that collision explicitly.
  const collisions = arrayOf(new DynamicModel({
    resource_type: "",
    id: "",
    slug: "",
  }));
  app.db().newQuery(`
    SELECT 'link' AS resource_type, id, slug
    FROM links
    WHERE lower(slug) = 'documentation'
    UNION ALL
    SELECT 'profile' AS resource_type, id, slug
    FROM public_profiles
    WHERE lower(slug) = 'documentation'
  `).all(collisions);

  if (collisions.length > 0) {
    throw new Error(
      "Cannot reserve /documentation while a Link or Public Profile uses that slug."
    );
  }

  const resources = [
    ["links", "link"],
    ["public_profiles", "profile"],
  ];

  for (const [table, resource] of resources) {
    for (const operation of ["insert", "update"]) {
      const triggerName =
        `prevent_documentation_reserved_${resource}_slug_on_${operation}`;
      const timing =
        operation === "insert" ? "BEFORE INSERT" : "BEFORE UPDATE OF slug";

      app.db().newQuery(`DROP TRIGGER IF EXISTS ${triggerName}`).execute();
      app.db().newQuery(`
        CREATE TRIGGER ${triggerName}
        ${timing} ON ${table}
        WHEN lower(NEW.slug) = 'documentation'
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
        `DROP TRIGGER IF EXISTS prevent_documentation_reserved_${resource}_slug_on_${operation}`
      ).execute();
    }
  }
});
