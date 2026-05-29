migrate((app) => {
  try {
    // 1. Check if public_profiles collection already exists
    try {
      const existing = app.findCollectionByNameOrId("public_profiles");
      if (existing) {
        console.log("Collection 'public_profiles' already exists, skipping creation");
        return;
      }
    } catch (e) {
      // Proceed to create
    }

    const collection = new Collection({
      id: "pbc_pub_profiles",
      name: "public_profiles",
      type: "base",
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.id != ''",
      updateRule: "user_id = @request.auth.id || @request.auth.role = 'admin'",
      deleteRule: "user_id = @request.auth.id || @request.auth.role = 'admin'",
    });

    // Add fields to collection (PocketBase 0.24 flat format)
    collection.fields.add(new RelationField({
      name: "user_id",
      required: true,
      collectionId: "_pb_users_auth_",
      maxSelect: 1,
      cascadeDelete: true,
    }));

    collection.fields.add(new TextField({
      name: "domain",
      required: false,
    }));

    collection.fields.add(new TextField({
      name: "slug",
      required: true,
    }));

    collection.fields.add(new TextField({
      name: "name",
      required: false,
    }));

    collection.fields.add(new TextField({
      name: "bio",
      required: false,
    }));

    collection.fields.add(new TextField({
      name: "theme",
      required: false,
    }));

    collection.fields.add(new TextField({
      name: "card_color",
      required: false,
    }));

    collection.fields.add(new BoolField({
      name: "online_counter",
      required: false,
    }));

    collection.fields.add(new JSONField({
      name: "social_links",
      required: false,
    }));

    collection.fields.add(new FileField({
      name: "custom_theme_bg",
      required: false,
      maxSelect: 1,
      maxSize: 5242880,
      mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"],
      protected: false,
    }));

    collection.fields.add(new FileField({
      name: "avatar",
      required: false,
      maxSelect: 1,
      maxSize: 5242880,
      mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"],
      protected: false,
    }));

    collection.fields.add(new TextField({
      name: "custom_domain",
      required: false,
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
    console.log("Successfully created 'public_profiles' collection");
  } catch (err) {
    console.error("FAILED to create 'public_profiles' collection:", err);
  }

  // 2. Add profile_id field to links
  try {
    const linksCollection = app.findCollectionByNameOrId("links");
    if (!linksCollection.fields.getByName("profile_id")) {
      linksCollection.fields.add(new RelationField({
        name: "profile_id",
        required: false,
        collectionId: "pbc_pub_profiles",
        maxSelect: 1,
        cascadeDelete: true,
      }));
      app.save(linksCollection);
      console.log("Successfully added 'profile_id' field to 'links'");
    }
  } catch (err) {
    console.error("FAILED to add 'profile_id' field to 'links':", err);
  }

  // 3. Create SQLite unique index for domain + slug on public_profiles
  try {
    app.db().newQuery("CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_domain_slug ON public_profiles (domain, slug)").execute();
    console.log("Successfully created idx_profiles_domain_slug unique index");
  } catch (err) {
    console.error("FAILED to create idx_profiles_domain_slug index:", err);
  }

  // 4. Data migration: users to public_profiles
  try {
    const rows = arrayOf(new DynamicModel({
      id: "",
      username: "",
      name: "",
      bio: "",
      theme: "",
      card_color: "",
      social_links: "",
      custom_theme_bg: "",
      avatar: "",
      created: "",
      updated: ""
    }));
    app.db().newQuery("SELECT id, username, coalesce(name, '') as name, coalesce(bio, '') as bio, coalesce(theme, 'minimal-dark') as theme, coalesce(card_color, '#000000') as card_color, coalesce(social_links, '[]') as social_links, coalesce(custom_theme_bg, '') as custom_theme_bg, coalesce(avatar, '') as avatar, created, updated FROM users WHERE username IS NOT NULL AND username != ''").all(rows);

    console.log(`Starting migration of ${rows.length} users to public_profiles...`);

    const usersCollection = app.findCollectionByNameOrId("users");
    const usersCollId = usersCollection.id; // Usually '_pb_users_auth_'
    const dataDir = app.dataDir();

    // Helper function to copy files safely
    const copyFile = (src, dest) => {
      try {
        const content = $os.readFile(src);
        const destDir = dest.substring(0, dest.lastIndexOf("/"));
        $os.mkdirAll(destDir, 0777);
        $os.writeFile(dest, content, 0666);
        return true;
      } catch (e) {
        // Log error but don't crash migration
        console.error(`File copy failed from ${src} to ${dest}:`, e);
        return false;
      }
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Check if profile already exists for this user
      const checks = arrayOf(new DynamicModel({
        id: ""
      }));
      app.db().newQuery("SELECT id FROM public_profiles WHERE user_id = {:userId} LIMIT 1")
        .bind({ userId: row.id })
        .all(checks);

      if (checks.length > 0) {
        console.log(`Profile already exists for user_id ${row.id}, skipping migration`);
        continue;
      }

      // Generate 15-char random alphanum ID for new profile
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let profileId = "";
      for (let j = 0; j < 15; j++) {
        profileId += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Default domain name
      const defaultDomain = "linktery.com";

      // Insert record
      app.db().newQuery("INSERT INTO public_profiles (id, user_id, domain, slug, name, bio, theme, card_color, online_counter, social_links, custom_theme_bg, avatar, created, updated) VALUES ({:id}, {:user_id}, {:domain}, {:slug}, {:name}, {:bio}, {:theme}, {:card_color}, {:online_counter}, {:social_links}, {:custom_theme_bg}, {:avatar}, {:created}, {:updated})")
        .bind({
          id: profileId,
          user_id: row.id,
          domain: defaultDomain,
          slug: row.username,
          name: row.name || "",
          bio: row.bio || "",
          theme: row.theme || "minimal-dark",
          card_color: row.card_color || "#000000",
          online_counter: 0,
          social_links: row.social_links || "[]",
          custom_theme_bg: row.custom_theme_bg || "",
          avatar: row.avatar || "",
          created: row.created,
          updated: row.updated
        })
        .execute();

      // Copy files if present
      if (row.avatar) {
        const src = `${dataDir}/storage/${usersCollId}/${row.id}/${row.avatar}`;
        const dest = `${dataDir}/storage/pbc_pub_profiles/${profileId}/${row.avatar}`;
        copyFile(src, dest);
      }

      if (row.custom_theme_bg) {
        const src = `${dataDir}/storage/${usersCollId}/${row.id}/${row.custom_theme_bg}`;
        const dest = `${dataDir}/storage/pbc_pub_profiles/${profileId}/${row.custom_theme_bg}`;
        copyFile(src, dest);
      }

      // Update associated links
      app.db().newQuery("UPDATE links SET profile_id = {:profileId} WHERE user_id = {:userId} AND show_on_profile = 1")
        .bind({
          profileId: profileId,
          userId: row.id
        })
        .execute();
    }

    console.log("Migration of profiles completed successfully");
  } catch (err) {
    console.error("FAILED to migrate user profiles to 'public_profiles':", err);
  }
}, (app) => {
  // Revert code if needed
});
