migrate((app) => {
  app.db().newQuery("ALTER TABLE growth_events ADD COLUMN path TEXT NOT NULL DEFAULT ''").execute();
  app.db().newQuery("ALTER TABLE growth_events ADD COLUMN landing_path TEXT NOT NULL DEFAULT ''").execute();
  app.db().newQuery("CREATE INDEX idx_growth_journey ON growth_events (journey_id, event_name, created)").execute();
  // Read-only reporting view. Join milestones at query time so an early
  // profile creation is attributed even if signup enrichment arrives later.
  // Keep historical unknown landing pages unknown; no guessed backfill.
  app.db().newQuery(`
    CREATE VIEW growth_acquisition_funnel AS
    SELECT signup.user_id, signup.created AS signed_up_at,
      signup.journey_id, signup.source, signup.medium, signup.campaign,
      signup.landing_path,
      MIN(CASE WHEN milestone.event_name = 'link_created' THEN milestone.created END) AS first_link_at,
      MIN(CASE WHEN milestone.event_name = 'profile_created' THEN milestone.created END) AS first_profile_at,
      MIN(CASE WHEN milestone.event_name = 'checkout_completed' THEN milestone.created END) AS first_checkout_at
    FROM growth_events signup
    LEFT JOIN growth_events milestone ON milestone.user_id = signup.user_id
      AND milestone.event_name IN ('link_created', 'profile_created', 'checkout_completed')
    WHERE signup.event_name = 'signup_completed' AND signup.user_id IS NOT NULL
      AND signup.id = 'signup:' || signup.user_id
    GROUP BY signup.id
  `).execute();
}, (app) => {
  app.db().newQuery("DROP VIEW IF EXISTS growth_acquisition_funnel").execute();
  app.db().newQuery("DROP INDEX IF EXISTS idx_growth_journey").execute();
  app.db().newQuery("ALTER TABLE growth_events DROP COLUMN landing_path").execute();
  app.db().newQuery("ALTER TABLE growth_events DROP COLUMN path").execute();
});
