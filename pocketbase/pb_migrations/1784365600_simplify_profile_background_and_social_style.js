migrate((app) => {
  const collection = app.findCollectionByNameOrId("public_profiles");

  app.db().newQuery(`
    UPDATE public_profiles
    SET social_link_style = 'icons'
    WHERE social_link_style = 'labeled-rows'
  `).execute();

  app.db().newQuery(`
    UPDATE public_profiles
    SET theme = 'sunset'
    WHERE theme IS NULL OR trim(theme) = '' OR theme != 'sunset'
  `).execute();

  // Keep the legacy theme and custom background fields for backward compatibility.
  // The client no longer exposes them; public rendering now uses Sunset blur or the avatar.
  if (!collection) return;
}, (app) => {
  // Data normalization is intentionally not reversed: the removed style and old
  // background picker are not valid presentation choices anymore.
});
