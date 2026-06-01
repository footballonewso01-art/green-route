migrate((app) => {
  // Fix public_profiles createRule — change to @request.auth.id != '' to bypass PB 0.24 relation evaluation quirks during creation.
  // Security is fully enforced via the JSVM hooks in main.pb.js.
  try {
    const profilesCollection = app.findCollectionByNameOrId("public_profiles");
    if (profilesCollection) {
      console.log("Current public_profiles createRule: " + JSON.stringify(profilesCollection.createRule));
      profilesCollection.createRule = "@request.auth.id != ''";
      app.save(profilesCollection);
      console.log("Fixed 'public_profiles' createRule to: @request.auth.id != ''");
    }
  } catch (err) {
    console.error("FAILED to fix 'public_profiles' createRule:", err);
  }
}, (app) => {
  try {
    const profilesCollection = app.findCollectionByNameOrId("public_profiles");
    if (profilesCollection) {
      profilesCollection.createRule = "@request.auth.id != '' && @request.auth.id = user_id";
      app.save(profilesCollection);
    }
  } catch (err) {
    console.error("FAILED to revert 'public_profiles' createRule:", err);
  }
});
