migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  // The Custom Domains migration was hardened during its staged rollout.
  // Existing databases may have recorded its older form before this field was
  // introduced, so this migration also serves as an explicit upgrade path.
  const domains = app.findCollectionByNameOrId("custom_domains");
  if (!domains.fields.getByName("provisioning_started_at")) {
    domains.fields.add(new TextField({
      name: "provisioning_started_at",
      max: 40,
    }));
    app.save(domains);
  }

  let events;
  try {
    events = app.findCollectionByNameOrId("custom_domain_provisioning_events");
  } catch (error) {
    events = new Collection({
      id: "pbc_cdprovs0001",
      name: "custom_domain_provisioning_events",
      type: "base",
      // This is a server-only anti-abuse ledger. It deliberately survives a
      // custom-domain disconnect, so create/delete cycling cannot erase the
      // provider allocation history. No generic Records API access is allowed.
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });

    events.fields.add(new RelationField({
      name: "user_id",
      required: true,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    events.fields.add(new TextField({
      name: "domain_record_id",
      required: true,
      min: 15,
      max: 15,
      pattern: "^[a-z0-9]{15}$",
    }));
    events.fields.add(new TextField({
      name: "hostname",
      required: true,
      min: 4,
      max: 253,
      pattern: "^[a-z0-9](?:[a-z0-9.-]{2,251}[a-z0-9])$",
    }));
    events.fields.add(new TextField({
      name: "plan",
      required: true,
      min: 3,
      max: 16,
      pattern: "^(pro|agency)$",
    }));
    events.fields.add(new TextField({
      name: "outcome",
      required: true,
      min: 7,
      max: 16,
      pattern: "^(attempted|allocated)$",
    }));
    events.fields.add(new TextField({
      name: "provider_hostname_id",
      required: false,
      max: 64,
    }));
    events.fields.add(new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    app.save(events);
  }

  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_cd_provision_owner_created ON custom_domain_provisioning_events (user_id, created DESC)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_cd_provision_created ON custom_domain_provisioning_events (created DESC)"
  ).execute();

  // An unverified local claim must not let one paid account squat a hostname
  // and block its real owner. Multiple pending claims may coexist; the first
  // claim that proves its account-specific TXT token atomically wins the
  // verified hostname. Public routing never reads unverified claims.
  app.db().newQuery("DROP INDEX IF EXISTS idx_custom_domains_hostname").execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_custom_domains_hostname_lookup ON custom_domains (hostname COLLATE NOCASE)"
  ).execute();
  app.db().newQuery(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_domains_verified_hostname
       ON custom_domains (hostname COLLATE NOCASE)
       WHERE dns_verified_at != '' OR provisioning_started_at != '' OR cloudflare_hostname_id != ''`
  ).execute();
}, (app) => {
  app.db().newQuery("DROP INDEX IF EXISTS idx_custom_domains_verified_hostname").execute();
  app.db().newQuery("DROP INDEX IF EXISTS idx_custom_domains_hostname_lookup").execute();
  // Rollback intentionally restores the original invariant. It will fail
  // closed if multiple pending claims have been created since this migration;
  // operators must resolve those claims explicitly rather than deleting them.
  app.db().newQuery(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_domains_hostname ON custom_domains (hostname COLLATE NOCASE)"
  ).execute();
  try {
    app.delete(app.findCollectionByNameOrId("custom_domain_provisioning_events"));
  } catch (error) {
    // Already removed.
  }
});
