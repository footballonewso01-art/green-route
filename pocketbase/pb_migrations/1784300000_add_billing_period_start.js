migrate((app) => {
  const billing = app.findCollectionByNameOrId("billing");
  if (!billing.fields.getByName("period_start")) {
    billing.fields.add(new Field({
      id: "period_start_id_gen",
      name: "period_start",
      type: "date",
      required: false,
    }));
    app.save(billing);
  }
}, (app) => {
  const billing = app.findCollectionByNameOrId("billing");
  if (billing.fields.getByName("period_start")) {
    billing.fields.removeByName("period_start");
    app.save(billing);
  }
});
