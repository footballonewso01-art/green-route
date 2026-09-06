migrate((app) => {
  app.db().newQuery("DROP VIEW IF EXISTS growth_acquisition_funnel").execute();
  app.db().newQuery("ALTER TABLE growth_events ADD COLUMN content TEXT NOT NULL DEFAULT ''").execute();
  app.db().newQuery(`
    CREATE INDEX idx_growth_campaign_content
    ON growth_events (campaign, content, event_name, created)
  `).execute();
  app.db().newQuery(`
    CREATE VIEW growth_acquisition_funnel AS
    SELECT signup.user_id, signup.created AS signed_up_at,
      signup.journey_id, signup.source, signup.medium, signup.campaign,
      signup.content, signup.landing_path,
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
  app.db().newQuery("DROP INDEX IF EXISTS idx_growth_campaign_content").execute();
  app.db().newQuery("ALTER TABLE growth_events DROP COLUMN content").execute();
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
});
