migrate((app) => {
  const collection = app.findCollectionByNameOrId("public_profiles");

  if (!collection.fields.getByName("profile_template")) {
    collection.fields.add(new TextField({
      name: "profile_template",
      required: false,
      max: 32,
    }));
    app.save(collection);
  }

  app.db().newQuery(`
    UPDATE public_profiles
    SET profile_template = 'classic'
    WHERE profile_template IS NULL OR trim(profile_template) = ''
  `).execute();
}, (app) => {
  const collection = app.findCollectionByNameOrId("public_profiles");
  if (collection.fields.getByName("profile_template")) {
    collection.fields.removeByName("profile_template");
    app.save(collection);
  }
});
