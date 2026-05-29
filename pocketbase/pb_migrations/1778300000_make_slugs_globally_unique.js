migrate((app) => {
  // 1. Drop existing domain+slug unique indexes if they exist
  try {
    app.db().newQuery("DROP INDEX IF EXISTS idx_profiles_domain_slug").execute();
    console.log("Successfully dropped idx_profiles_domain_slug index");
  } catch (err) {
    console.warn("Could not drop idx_profiles_domain_slug (might not exist):", err);
  }

  try {
    app.db().newQuery("DROP INDEX IF EXISTS idx_links_domain_slug").execute();
    console.log("Successfully dropped idx_links_domain_slug index");
  } catch (err) {
    console.warn("Could not drop idx_links_domain_slug (might not exist):", err);
  }

  // 2. Create new global unique indexes on slug alone
  try {
    app.db().newQuery("CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug ON public_profiles (slug)").execute();
    console.log("Successfully created idx_profiles_slug unique index");
  } catch (err) {
    console.error("FAILED to create idx_profiles_slug index:", err);
  }

  try {
    app.db().newQuery("CREATE UNIQUE INDEX IF NOT EXISTS idx_links_slug ON links (slug)").execute();
    console.log("Successfully created idx_links_slug unique index");
  } catch (err) {
    console.error("FAILED to create idx_links_slug index:", err);
  }
}, (app) => {
  // Revert code if needed
});
