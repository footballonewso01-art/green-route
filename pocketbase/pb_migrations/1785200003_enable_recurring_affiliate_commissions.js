migrate((app) => {
  const commissions = app.findCollectionByNameOrId("affiliate_commissions");

  if (!commissions.fields.getByName("stripe_subscription_id")) {
    commissions.fields.add(new TextField({
      name: "stripe_subscription_id",
      required: false,
      max: 255,
    }));
  }
  if (!commissions.fields.getByName("billing_reason")) {
    commissions.fields.add(new TextField({
      name: "billing_reason",
      required: false,
      max: 40,
    }));
  }
  if (!commissions.fields.getByName("commission_type")) {
    commissions.fields.add(new TextField({
      name: "commission_type",
      required: false,
      max: 16,
    }));
  }
  app.save(commissions);

  // Existing rows were created by the original first-payment-only model.
  app.db().newQuery(`
    UPDATE affiliate_commissions
    SET commission_type = 'initial'
    WHERE commission_type IS NULL OR commission_type = ''
  `).execute();

  const commissionType = commissions.fields.getByName("commission_type");
  if (commissionType) {
    commissionType.required = true;
    app.save(commissions);
  }

  // An attribution is intentionally allowed to own many commission rows. The
  // invoice id remains unique and is the financial idempotency boundary.
  app.db().newQuery(
    "DROP INDEX IF EXISTS idx_affiliate_commissions_attribution"
  ).execute();
  app.db().newQuery(`
    CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_attribution_created
    ON affiliate_commissions (attribution_id, created DESC)
  `).execute();
  app.db().newQuery(`
    CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_subscription_created
    ON affiliate_commissions (stripe_subscription_id, created DESC)
  `).execute();
}, (app) => {
  // Recurring commissions are financial records and must not be deleted or
  // made invalid by a rollback. Older hooks safely ignore the extra fields and
  // continue to rely on the unique Stripe invoice index.
});
