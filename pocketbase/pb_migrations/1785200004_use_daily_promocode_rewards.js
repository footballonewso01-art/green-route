migrate((app) => {
  const promocodes = app.findCollectionByNameOrId("promocodes");
  const rewardDays = promocodes.fields.getByName("reward_days");

  if (!rewardDays) {
    promocodes.fields.add(new NumberField({
      name: "reward_days",
      required: false,
      min: 0,
      max: 1095,
      onlyInt: true,
    }));
    app.save(promocodes);
  } else {
    rewardDays.required = false;
    rewardDays.min = 0;
    rewardDays.onlyInt = true;
    app.save(promocodes);
  }

  // Preserve every unredeemed monthly offer as an exact day duration. Existing
  // users already have plan_expires_at persisted, so their active reward dates
  // are intentionally not changed.
  app.db().newQuery(`
    UPDATE promocodes
    SET reward_days = reward_months * 30
    WHERE coalesce(reward_months, 0) > 0
      AND coalesce(reward_days, 0) = 0
  `).execute();
  app.db().newQuery(`
    UPDATE promocodes
    SET reward_months = 0
    WHERE coalesce(reward_months, 0) > 0
  `).execute();
}, (app) => {
  // Day-based durations are more precise and cannot be converted back to
  // calendar months without losing information. Keep the migrated values.
});
