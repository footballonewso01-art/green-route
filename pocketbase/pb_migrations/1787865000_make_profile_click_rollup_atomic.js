migrate((app) => {
  // The row and its profile counter must commit together. An after-success
  // JS hook runs after the click commit, leaving a window where reconciliation
  // already includes the new row and the hook then increments it a second time.
  // SQLite serializes this trigger with the reconciliation's single UPSERT.
  // No historical scan is needed at startup; the existing bounded reconciliation
  // repairs recent drift on its next run.
  app.db().newQuery(`
    CREATE TRIGGER IF NOT EXISTS increment_profile_click_rollup
    AFTER INSERT ON clicks
    WHEN NEW.source_profile_id != '' AND NEW.profile_link_id != ''
      AND EXISTS (SELECT 1 FROM public_profiles WHERE id = NEW.source_profile_id)
      AND EXISTS (SELECT 1 FROM links WHERE id = NEW.link_id)
    BEGIN
      INSERT INTO profile_click_hourly_rollup (
        profile_id, profile_link_id, link_id, bucket, total, unique_count
      ) VALUES (
        NEW.source_profile_id, NEW.profile_link_id, NEW.link_id,
        strftime('%Y-%m-%dT%H:00:00Z', NEW.created),
        1, CASE WHEN NEW.is_unique = 1 THEN 1 ELSE 0 END
      )
      ON CONFLICT (profile_id, profile_link_id, link_id, bucket)
      DO UPDATE SET
        total = total + 1,
        unique_count = unique_count + excluded.unique_count;
    END
  `).execute();
}, (app) => {
  // Roll back together with the application revision that restores the old
  // JS incrementer; never run both incrementers against the same database.
  app.db().newQuery("DROP TRIGGER IF EXISTS increment_profile_click_rollup").execute();
});
