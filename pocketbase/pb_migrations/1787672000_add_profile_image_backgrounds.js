migrate((app) => {
  const collection = app.findCollectionByNameOrId("public_profiles");
  let changed = false;

  if (!collection.fields.getByName("profile_background_mode")) {
    collection.fields.add(new TextField({
      name: "profile_background_mode",
      required: false,
      max: 16,
    }));
    changed = true;
  }

  if (!collection.fields.getByName("profile_background_image")) {
    collection.fields.add(new FileField({
      name: "profile_background_image",
      required: false,
      maxSelect: 1,
      maxSize: 5242880,
      mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      thumbs: ["640x0", "1280x0"],
      protected: false,
    }));
    changed = true;
  }

  if (!collection.fields.getByName("profile_background_position")) {
    collection.fields.add(new TextField({
      name: "profile_background_position",
      required: false,
      max: 16,
    }));
    changed = true;
  }

  if (!collection.fields.getByName("profile_background_overlay")) {
    collection.fields.add(new TextField({
      name: "profile_background_overlay",
      required: false,
      max: 16,
    }));
    changed = true;
  }

  if (changed) {
    app.save(collection);
  }

  app.db().newQuery(`
    UPDATE public_profiles
    SET profile_background_mode = 'color'
    WHERE profile_background_mode IS NULL OR trim(profile_background_mode) = ''
  `).execute();

  app.db().newQuery(`
    UPDATE public_profiles
    SET profile_background_position = 'center'
    WHERE profile_background_position IS NULL OR trim(profile_background_position) = ''
  `).execute();

  app.db().newQuery(`
    UPDATE public_profiles
    SET profile_background_overlay = 'balanced'
    WHERE profile_background_overlay IS NULL OR trim(profile_background_overlay) = ''
  `).execute();
}, (app) => {
  const collection = app.findCollectionByNameOrId("public_profiles");
  let changed = false;

  [
    "profile_background_mode",
    "profile_background_image",
    "profile_background_position",
    "profile_background_overlay",
  ].forEach((fieldName) => {
    if (collection.fields.getByName(fieldName)) {
      collection.fields.removeByName(fieldName);
      changed = true;
    }
  });

  if (changed) {
    app.save(collection);
  }
});
