migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const links = app.findCollectionByNameOrId("links");
  const profiles = app.findCollectionByNameOrId("public_profiles");

  let domains;
  try {
    domains = app.findCollectionByNameOrId("custom_domains");
  } catch (error) {
    domains = new Collection({
      id: "pbc_cdomains001",
      name: "custom_domains",
      type: "base",
      // Domain ownership, Cloudflare identifiers and validation tokens must
      // never be exposed through the generic Records API. Purpose-built
      // authenticated routes return a field-limited owner DTO.
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });

    domains.fields.add(new RelationField({
      name: "user_id",
      required: true,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    domains.fields.add(new TextField({
      name: "hostname",
      required: true,
      min: 4,
      max: 253,
      pattern: "^[a-z0-9](?:[a-z0-9.-]{2,251}[a-z0-9])$",
    }));
    domains.fields.add(new TextField({
      name: "target_type",
      required: true,
      min: 4,
      max: 7,
      pattern: "^(link|profile)$",
    }));
    domains.fields.add(new RelationField({
      name: "link_id",
      required: false,
      collectionId: links.id,
      maxSelect: 1,
      cascadeDelete: false,
    }));
    domains.fields.add(new RelationField({
      name: "profile_id",
      required: false,
      collectionId: profiles.id,
      maxSelect: 1,
      cascadeDelete: false,
    }));
    for (const field of [
      ["status", 24],
      ["hostname_status", 32],
      ["ssl_status", 32],
      ["cloudflare_hostname_id", 64],
      ["cname_target", 253],
      ["ownership_type", 16],
      ["ownership_name", 253],
      ["ownership_value", 512],
      ["ssl_txt_name", 253],
      ["ssl_txt_value", 512],
      ["last_checked_at", 40],
      ["activated_at", 40],
    ]) {
      domains.fields.add(new TextField({
        name: field[0],
        required: field[0] === "status",
        max: field[1],
      }));
    }
    domains.fields.add(new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    domains.fields.add(new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));
    app.save(domains);
  }

  // Local ownership proof and short operation leases are independent of
  // Cloudflare's zone-wide hostname validation (which alone is not tenant proof).
  for (const field of [
    ["ownership_token", 96], ["dns_verified_at", 40], ["provisioning_started_at", 40],
    ["operation_token", 64], ["operation_expires_at", 40], ["next_check_at", 40],
    ["ssl_records_json", 4096],
  ]) {
    if (!domains.fields.getByName(field[0])) domains.fields.add(new TextField({ name: field[0], max: field[1] }));
  }
  app.save(domains);

  app.db().newQuery(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_domains_hostname ON custom_domains (hostname COLLATE NOCASE)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_custom_domains_owner ON custom_domains (user_id, created DESC)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON custom_domains (status, updated)"
  ).execute();
  app.db().newQuery(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_domains_cf_id ON custom_domains (cloudflare_hostname_id) WHERE cloudflare_hostname_id != ''"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_custom_domains_check ON custom_domains (next_check_at)"
  ).execute();

  // Defense in depth for writes performed outside the HTTP lifecycle routes:
  // exactly one target is required and it must belong to the same account.
  for (const statement of [
    `CREATE TRIGGER IF NOT EXISTS custom_domains_target_guard_insert
       BEFORE INSERT ON custom_domains
       WHEN NOT (
         (NEW.target_type = 'link' AND NEW.link_id != '' AND COALESCE(NEW.profile_id, '') = ''
           AND EXISTS (SELECT 1 FROM links l WHERE l.id = NEW.link_id AND l.user_id = NEW.user_id))
         OR
         (NEW.target_type = 'profile' AND NEW.profile_id != '' AND COALESCE(NEW.link_id, '') = ''
           AND EXISTS (SELECT 1 FROM public_profiles p WHERE p.id = NEW.profile_id AND p.user_id = NEW.user_id))
       )
       BEGIN SELECT RAISE(ABORT, 'Invalid custom domain target'); END`,
    `CREATE TRIGGER IF NOT EXISTS custom_domains_target_guard_update
       BEFORE UPDATE OF user_id, target_type, link_id, profile_id ON custom_domains
       WHEN NOT (
         (NEW.target_type = 'link' AND NEW.link_id != '' AND COALESCE(NEW.profile_id, '') = ''
           AND EXISTS (SELECT 1 FROM links l WHERE l.id = NEW.link_id AND l.user_id = NEW.user_id))
         OR
         (NEW.target_type = 'profile' AND NEW.profile_id != '' AND COALESCE(NEW.link_id, '') = ''
           AND EXISTS (SELECT 1 FROM public_profiles p WHERE p.id = NEW.profile_id AND p.user_id = NEW.user_id))
       )
       BEGIN SELECT RAISE(ABORT, 'Invalid custom domain target'); END`,
  ]) app.db().newQuery(statement).execute();
}, (app) => {
  app.db().newQuery("DROP TRIGGER IF EXISTS custom_domains_target_guard_insert").execute();
  app.db().newQuery("DROP TRIGGER IF EXISTS custom_domains_target_guard_update").execute();
  try {
    app.delete(app.findCollectionByNameOrId("custom_domains"));
  } catch (error) {
    // Already removed.
  }
});
