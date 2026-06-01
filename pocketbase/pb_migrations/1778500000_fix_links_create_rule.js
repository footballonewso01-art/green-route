migrate((app) => {
  // Fix links createRule — it was null (superusers only), should allow authenticated users
  try {
    const linksCollection = app.findCollectionByNameOrId("links");
    if (linksCollection) {
      console.log("Current links createRule: " + JSON.stringify(linksCollection.createRule));
      
      // Allow authenticated users to create links (owned by them)
      linksCollection.createRule = "@request.auth.id != ''";
      
      app.save(linksCollection);
      console.log("Fixed 'links' createRule to: @request.auth.id != ''");
    }
  } catch (err) {
    console.error("FAILED to fix 'links' createRule:", err);
  }

  // Also verify public_profiles createRule is correct
  try {
    const profilesCollection = app.findCollectionByNameOrId("public_profiles");
    if (profilesCollection) {
      console.log("Current public_profiles createRule: " + JSON.stringify(profilesCollection.createRule));
      
      // Ensure authenticated users can create profiles (with IDOR protection)
      if (!profilesCollection.createRule || profilesCollection.createRule === "") {
        profilesCollection.createRule = "@request.auth.id != '' && @request.auth.id = user_id";
        app.save(profilesCollection);
        console.log("Fixed 'public_profiles' createRule");
      } else {
        console.log("public_profiles createRule is already set, no change needed");
      }
    }
  } catch (err) {
    console.error("FAILED to fix 'public_profiles' createRule:", err);
  }
}, (app) => {
  // Revert — set links createRule back to null (superusers only)
  try {
    const linksCollection = app.findCollectionByNameOrId("links");
    if (linksCollection) {
      linksCollection.createRule = null;
      app.save(linksCollection);
    }
  } catch (err) {
    console.error("FAILED to revert 'links' createRule:", err);
  }
});
