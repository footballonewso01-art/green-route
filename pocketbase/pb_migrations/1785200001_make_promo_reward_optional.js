migrate((app) => {
  const promocodes = app.findCollectionByNameOrId("promocodes");
  const rewardPlan = promocodes.fields.getByName("reward_plan");
  const rewardDays = promocodes.fields.getByName("reward_days");
  if (rewardPlan) rewardPlan.required = false;
  if (rewardDays) rewardDays.required = false;
  app.save(promocodes);
}, (app) => {
  const promocodes = app.findCollectionByNameOrId("promocodes");
  const rewardPlan = promocodes.fields.getByName("reward_plan");
  const rewardDays = promocodes.fields.getByName("reward_days");
  if (rewardPlan) rewardPlan.required = true;
  if (rewardDays) rewardDays.required = true;
  app.save(promocodes);
});
