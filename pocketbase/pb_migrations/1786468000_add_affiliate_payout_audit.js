migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const payouts = app.findCollectionByNameOrId("affiliate_payouts");

  if (!payouts.fields.getByName("created_by")) {
    payouts.fields.add(new RelationField({
      name: "created_by",
      required: false,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: false,
    }));
  }

  if (!payouts.fields.getByName("created_by_email")) {
    payouts.fields.add(new TextField({
      name: "created_by_email",
      required: false,
      max: 255,
    }));
  }

  app.save(payouts);
  app.db().newQuery(
    "CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_partner_paid_at " +
    "ON affiliate_payouts (partner_id, paid_at DESC)"
  ).execute();
}, (app) => {
  const payouts = app.findCollectionByNameOrId("affiliate_payouts");

  app.db().newQuery("DROP INDEX IF EXISTS idx_affiliate_payouts_partner_paid_at").execute();
  if (payouts.fields.getByName("created_by_email")) {
    payouts.fields.removeByName("created_by_email");
  }
  if (payouts.fields.getByName("created_by")) {
    payouts.fields.removeByName("created_by");
  }
  app.save(payouts);
});
