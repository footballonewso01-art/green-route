migrate((app) => {
  // Raw Link records contain destinations, targeting rules, pixels and owner
  // relations. Public navigation is served by purpose-built routes; the
  // generic Records API is restricted to the owner and application admins.
  const links = app.findCollectionByNameOrId("links");
  const ownerRule = "user_id = @request.auth.id || @request.auth.role = 'admin'";
  links.listRule = ownerRule;
  links.viewRule = ownerRule;
  links.updateRule = ownerRule;
  links.deleteRule = ownerRule;
  app.save(links);

  // Active image formats (SVG) are not accepted as user uploads. GIF is also
  // excluded so every accepted file can be decoded and re-encoded by the
  // existing raster crop/thumbnail pipeline. Existing files are retained;
  // this policy prevents new unsafe uploads without deleting customer data.
  const safeRasterMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  const imageFields = {
    links: ["bg_image"],
    profile_links: ["bg_image"],
    public_profiles: ["avatar", "custom_theme_bg", "profile_background_image"],
    users: ["avatar", "custom_theme_bg"],
  };

  Object.keys(imageFields).forEach((collectionName) => {
    const collection = app.findCollectionByNameOrId(collectionName);
    let changed = false;
    imageFields[collectionName].forEach((fieldName) => {
      const field = collection.fields.getByName(fieldName);
      if (!field) return;
      field.mimeTypes = safeRasterMimeTypes.slice();
      changed = true;
    });
    if (changed) app.save(collection);
  });

  // Re-save application settings through PocketBase's settings model. In the
  // production container the encryption environment is already configured,
  // so existing OAuth/SMTP/storage secrets are rewritten through the encrypted
  // settings serializer during this migration.
  const settings = app.settings();
  app.save(settings);

  console.log("Restricted raw Link records and active image upload formats");
}, (app) => {
  // Security policies intentionally remain in place on application rollback.
  // Reopening raw Link records or active file formats must be a deliberate
  // migration, never an automatic side effect of reverting application code.
  console.log("Link record and image upload hardening retained on rollback");
});
