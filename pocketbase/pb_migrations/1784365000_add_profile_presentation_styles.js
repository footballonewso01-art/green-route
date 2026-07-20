migrate((app) => {
  const collection = app.findCollectionByNameOrId("public_profiles");
  let changed = false;

  if (!collection.fields.getByName("link_card_style")) {
    collection.fields.add(new TextField({
      name: "link_card_style",
      required: false,
      max: 32,
    }));
    changed = true;
  }

  if (!collection.fields.getByName("social_link_style")) {
    collection.fields.add(new TextField({
      name: "social_link_style",
      required: false,
      max: 32,
    }));
    changed = true;
  }

  if (changed) {
    app.save(collection);
  }

  app.db().newQuery(`
    UPDATE public_profiles
    SET link_card_style = 'glass'
    WHERE link_card_style IS NULL OR trim(link_card_style) = ''
  `).execute();

  app.db().newQuery(`
    UPDATE public_profiles
    SET social_link_style = 'icons'
    WHERE social_link_style IS NULL OR trim(social_link_style) = ''
  `).execute();
}, (app) => {
  const collection = app.findCollectionByNameOrId("public_profiles");
  let changed = false;

  if (collection.fields.getByName("link_card_style")) {
    collection.fields.removeByName("link_card_style");
    changed = true;
  }

  if (collection.fields.getByName("social_link_style")) {
    collection.fields.removeByName("social_link_style");
    changed = true;
  }

  if (changed) {
    app.save(collection);
  }
});
