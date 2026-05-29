migrate((app) => {
  try {
    const collection = app.findCollectionByNameOrId("public_profiles");
    if (collection) {
      // 1. Restrict createRule to matching authenticated user only (prevent IDOR)
      collection.createRule = "@request.auth.id != '' && @request.auth.id = user_id";
      
      // 2. Keep listRule public so that visitors can view bio pages (lookups by slug).
      // Security is enforced via JS hooks (onRecordsListRequest) to block bulk scraping.
      collection.listRule = "";
      
      // 3. Keep viewRule public so users can view custom bio link pages without auth
      collection.viewRule = "";
      
      app.save(collection);
      console.log("Successfully hardened 'public_profiles' collection rules.");
    }
  } catch (err) {
    console.error("FAILED to harden 'public_profiles' collection rules:", err);
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("public_profiles");
    if (collection) {
      // Revert to initial migration rules
      collection.createRule = "@request.auth.id != ''";
      collection.listRule = "";
      collection.viewRule = "";
      app.save(collection);
      console.log("Reverted 'public_profiles' collection rules.");
    }
  } catch (err) {
    console.error("FAILED to revert 'public_profiles' collection rules:", err);
  }
});
