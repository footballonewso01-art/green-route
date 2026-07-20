migrate((app) => {
  let collection;
  try {
    collection = app.findCollectionByNameOrId("profile_links");
  } catch (error) {
    collection = new Collection({
      id: "pbc_profile_links",
      name: "profile_links",
      type: "base",
      listRule: "visible = true || @request.auth.id = user_id || @request.auth.role = 'admin'",
      viewRule: "visible = true || @request.auth.id = user_id || @request.auth.role = 'admin'",
      createRule: "@request.auth.id != '' && (@request.auth.id = user_id || @request.auth.role = 'admin')",
      updateRule: "@request.auth.id = user_id || @request.auth.role = 'admin'",
      deleteRule: "@request.auth.id = user_id || @request.auth.role = 'admin'",
    });

    collection.fields.add(new RelationField({
      name: "user_id",
      required: true,
      collectionId: "_pb_users_auth_",
      maxSelect: 1,
      cascadeDelete: true,
    }));
    collection.fields.add(new RelationField({
      name: "profile_id",
      required: true,
      collectionId: "pbc_pub_profiles",
      maxSelect: 1,
      cascadeDelete: true,
    }));

    const links = app.findCollectionByNameOrId("links");
    collection.fields.add(new RelationField({
      name: "link_id",
      required: true,
      collectionId: links.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    collection.fields.add(new NumberField({
      name: "order",
      required: false,
      min: 0,
      onlyInt: true,
    }));
    collection.fields.add(new BoolField({
      name: "visible",
      required: false,
    }));
    collection.fields.add(new TextField({
      name: "title_override",
      required: false,
      max: 200,
    }));
    collection.fields.add(new TextField({
      name: "size",
      required: false,
      max: 16,
    }));
    collection.fields.add(new FileField({
      name: "bg_image",
      required: false,
      maxSelect: 1,
      maxSize: 5242880,
      mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      protected: false,
    }));
    collection.fields.add(new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    collection.fields.add(new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));

    app.save(collection);
  }

  app.db().newQuery(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_links_profile_link ON profile_links (profile_id, link_id)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_profile_links_profile_order ON profile_links (profile_id, visible, `order`)"
  ).execute();
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_profile_links_user_link ON profile_links (user_id, link_id)"
  ).execute();

  // Preserve every existing Public Profile assignment and presentation setting.
  // Legacy columns stay on links for rollback safety but are no longer written by
  // the application after this migration.
  const rows = arrayOf(new DynamicModel({
    id: "",
    user_id: "",
    profile_id: "",
    order_value: "",
    size_value: "",
    bg_image: "",
    created: "",
    updated: "",
  }));
  app.db().newQuery(`
    SELECT id, user_id, profile_id,
           coalesce("order", '0') AS order_value,
           coalesce(size, 'regular') AS size_value,
           coalesce(bg_image, '') AS bg_image,
           created, updated
    FROM links
    WHERE profile_id != '' AND show_on_profile = 1
  `).all(rows);

  const linksCollection = app.findCollectionByNameOrId("links");
  const dataDir = app.dataDir();
  const randomId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 15; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const existing = arrayOf(new DynamicModel({ id: "" }));
    app.db().newQuery(
      "SELECT id FROM profile_links WHERE profile_id = {:profileId} AND link_id = {:linkId} LIMIT 1"
    ).bind({ profileId: row.profile_id, linkId: row.id }).all(existing);
    if (existing.length > 0) continue;

    const profileLinkId = randomId();
    const parsedOrder = Math.max(0, parseInt(String(row.order_value || "0"), 10) || 0);
    const size = row.size_value === "large" ? "large" : "regular";

    app.db().newQuery(`
      INSERT INTO profile_links (
        id, user_id, profile_id, link_id, "order", visible,
        title_override, size, bg_image, created, updated
      ) VALUES (
        {:id}, {:userId}, {:profileId}, {:linkId}, {:order}, 1,
        '', {:size}, {:bgImage}, {:created}, {:updated}
      )
    `).bind({
      id: profileLinkId,
      userId: row.user_id,
      profileId: row.profile_id,
      linkId: row.id,
      order: parsedOrder,
      size: size,
      bgImage: row.bg_image,
      created: row.created,
      updated: row.updated,
    }).execute();

    if (row.bg_image) {
      const source = `${dataDir}/storage/${linksCollection.id}/${row.id}/${row.bg_image}`;
      const destinationDir = `${dataDir}/storage/${collection.id}/${profileLinkId}`;
      const destination = `${destinationDir}/${row.bg_image}`;
      try {
        const content = $os.readFile(source);
        $os.mkdirAll(destinationDir, 0777);
        $os.writeFile(destination, content, 0666);
      } catch (error) {
        console.warn("Could not copy legacy profile link background " + row.id + ": " + error);
        app.db().newQuery("UPDATE profile_links SET bg_image = '' WHERE id = {:id}")
          .bind({ id: profileLinkId })
          .execute();
      }
    }
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("profile_links");
    app.delete(collection);
  } catch (error) {
    // Already removed.
  }
});
