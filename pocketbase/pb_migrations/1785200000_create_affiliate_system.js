migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  let promocodes;
  try {
    promocodes = app.findCollectionByNameOrId("promocodes");
  } catch (error) {
    promocodes = new Collection({
      id: "pbc_promocodes",
      name: "promocodes",
      type: "base",
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
    });
    promocodes.fields.add(new TextField({
      name: "code",
      required: true,
      min: 3,
      max: 32,
      pattern: "^[A-Z0-9][A-Z0-9_-]+$",
    }));
    promocodes.fields.add(new NumberField({
      name: "max_uses",
      required: false,
      min: 0,
      onlyInt: true,
    }));
    promocodes.fields.add(new NumberField({
      name: "current_uses",
      required: false,
      min: 0,
      onlyInt: true,
    }));
    // These legacy fields remain populated for backward compatibility.
    // reward_enabled is the source of truth for whether a reward is granted.
    promocodes.fields.add(new TextField({
      name: "reward_plan",
      required: true,
      max: 16,
    }));
    promocodes.fields.add(new NumberField({
      name: "reward_days",
      required: true,
      min: 0,
      onlyInt: true,
    }));
    promocodes.fields.add(new BoolField({
      name: "is_active",
      required: false,
    }));
    promocodes.fields.add(new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    promocodes.fields.add(new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));
    app.save(promocodes);
  }

  let promoChanged = false;
  const addPromoField = (field) => {
    if (!promocodes.fields.getByName(field.name)) {
      promocodes.fields.add(field);
      promoChanged = true;
    }
  };
  addPromoField(new RelationField({
    name: "partner_id",
    required: false,
    collectionId: users.id,
    maxSelect: 1,
    cascadeDelete: false,
  }));
  addPromoField(new TextField({
    name: "internal_name",
    required: false,
    max: 120,
  }));
  addPromoField(new BoolField({
    name: "reward_enabled",
    required: false,
  }));
  addPromoField(new NumberField({
    name: "reward_months",
    required: false,
    min: 0,
    max: 36,
    onlyInt: true,
  }));
  addPromoField(new NumberField({
    name: "commission_rate_bps",
    required: false,
    min: 0,
    max: 10000,
    onlyInt: true,
  }));
  if (promoChanged) app.save(promocodes);

  // Existing codes predate reward_enabled. They all represented a reward.
  app.db().newQuery(`
    UPDATE promocodes
    SET reward_enabled = 1
    WHERE reward_enabled = 0 AND coalesce(reward_days, 0) > 0
  `).execute();

  let logs;
  try {
    logs = app.findCollectionByNameOrId("promocode_logs");
  } catch (error) {
    logs = new Collection({
      id: "pbc_promo_logs",
      name: "promocode_logs",
      type: "base",
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    logs.fields.add(new RelationField({
      name: "promocode_id",
      required: true,
      collectionId: promocodes.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    logs.fields.add(new RelationField({
      name: "user_id",
      required: true,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    logs.fields.add(new TextField({
      name: "plan_awarded",
      required: false,
      max: 16,
    }));
    logs.fields.add(new NumberField({
      name: "days_awarded",
      required: false,
      min: 0,
      onlyInt: true,
    }));
    logs.fields.add(new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    logs.fields.add(new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));
    app.save(logs);
  }

  let partners;
  try {
    partners = app.findCollectionByNameOrId("affiliate_partners");
  } catch (error) {
    partners = new Collection({
      id: "pbc_aff_partners",
      name: "affiliate_partners",
      type: "base",
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    partners.fields.add(new RelationField({
      name: "user_id",
      required: true,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    partners.fields.add(new TextField({
      name: "referral_code",
      required: true,
      min: 8,
      max: 40,
      pattern: "^[a-zA-Z0-9_-]+$",
    }));
    partners.fields.add(new RelationField({
      name: "primary_promocode_id",
      required: false,
      collectionId: promocodes.id,
      maxSelect: 1,
      cascadeDelete: false,
    }));
    partners.fields.add(new NumberField({
      name: "default_commission_rate_bps",
      required: false,
      min: 0,
      max: 10000,
      onlyInt: true,
    }));
    partners.fields.add(new TextField({
      name: "status",
      required: false,
      max: 16,
    }));
    partners.fields.add(new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    partners.fields.add(new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));
    app.save(partners);
  }

  let attributions;
  try {
    attributions = app.findCollectionByNameOrId("affiliate_attributions");
  } catch (error) {
    attributions = new Collection({
      id: "pbc_aff_attribs",
      name: "affiliate_attributions",
      type: "base",
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    attributions.fields.add(new RelationField({
      name: "partner_id",
      required: true,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    attributions.fields.add(new RelationField({
      name: "referred_user_id",
      required: true,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    attributions.fields.add(new RelationField({
      name: "promocode_id",
      required: false,
      collectionId: promocodes.id,
      maxSelect: 1,
      cascadeDelete: false,
    }));
    attributions.fields.add(new TextField({
      name: "source",
      required: true,
      max: 24,
    }));
    attributions.fields.add(new TextField({
      name: "referral_code",
      required: false,
      max: 40,
    }));
    attributions.fields.add(new NumberField({
      name: "commission_rate_bps",
      required: false,
      min: 0,
      max: 10000,
      onlyInt: true,
    }));
    attributions.fields.add(new BoolField({
      name: "commission_eligible",
      required: false,
    }));
    attributions.fields.add(new TextField({
      name: "risk_status",
      required: false,
      max: 16,
    }));
    attributions.fields.add(new TextField({
      name: "status",
      required: false,
      max: 20,
    }));
    attributions.fields.add(new Field({
      id: "aff_attr_at",
      name: "attributed_at",
      type: "date",
      required: false,
    }));
    attributions.fields.add(new TextField({
      name: "first_paid_invoice_id",
      required: false,
      max: 255,
    }));
    attributions.fields.add(new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    attributions.fields.add(new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));
    app.save(attributions);
  }

  let commissions;
  try {
    commissions = app.findCollectionByNameOrId("affiliate_commissions");
  } catch (error) {
    commissions = new Collection({
      id: "pbc_aff_commiss",
      name: "affiliate_commissions",
      type: "base",
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    commissions.fields.add(new RelationField({
      name: "partner_id",
      required: true,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    commissions.fields.add(new RelationField({
      name: "referred_user_id",
      required: true,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    commissions.fields.add(new RelationField({
      name: "attribution_id",
      required: true,
      collectionId: attributions.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    commissions.fields.add(new RelationField({
      name: "promocode_id",
      required: false,
      collectionId: promocodes.id,
      maxSelect: 1,
      cascadeDelete: false,
    }));
    commissions.fields.add(new TextField({
      name: "stripe_invoice_id",
      required: true,
      max: 255,
    }));
    commissions.fields.add(new NumberField({
      name: "amount_paid_cents",
      required: true,
      min: 0,
      onlyInt: true,
    }));
    commissions.fields.add(new NumberField({
      name: "refunded_cents",
      required: false,
      min: 0,
      onlyInt: true,
    }));
    commissions.fields.add(new NumberField({
      name: "commission_rate_bps",
      required: true,
      min: 0,
      max: 10000,
      onlyInt: true,
    }));
    commissions.fields.add(new NumberField({
      name: "commission_cents",
      required: true,
      min: 0,
      onlyInt: true,
    }));
    commissions.fields.add(new TextField({
      name: "currency",
      required: true,
      max: 3,
    }));
    commissions.fields.add(new TextField({
      name: "plan",
      required: false,
      max: 16,
    }));
    commissions.fields.add(new TextField({
      name: "status",
      required: true,
      max: 20,
    }));
    commissions.fields.add(new Field({
      id: "aff_comm_avail",
      name: "available_at",
      type: "date",
      required: false,
    }));
    commissions.fields.add(new Field({
      id: "aff_comm_rev",
      name: "reversed_at",
      type: "date",
      required: false,
    }));
    commissions.fields.add(new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    commissions.fields.add(new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));
    app.save(commissions);
  }

  let payouts;
  try {
    payouts = app.findCollectionByNameOrId("affiliate_payouts");
  } catch (error) {
    payouts = new Collection({
      id: "pbc_aff_payouts",
      name: "affiliate_payouts",
      type: "base",
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });
    payouts.fields.add(new RelationField({
      name: "partner_id",
      required: true,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    payouts.fields.add(new NumberField({
      name: "amount_cents",
      required: true,
      min: 1,
      onlyInt: true,
    }));
    payouts.fields.add(new TextField({
      name: "currency",
      required: true,
      max: 3,
    }));
    payouts.fields.add(new TextField({
      name: "status",
      required: true,
      max: 20,
    }));
    payouts.fields.add(new TextField({
      name: "reference",
      required: false,
      max: 255,
    }));
    payouts.fields.add(new TextField({
      name: "note",
      required: false,
      max: 500,
    }));
    payouts.fields.add(new Field({
      id: "aff_payout_paid",
      name: "paid_at",
      type: "date",
      required: false,
    }));
    payouts.fields.add(new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }));
    payouts.fields.add(new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    }));
    app.save(payouts);
  }

  app.db().newQuery("CREATE UNIQUE INDEX IF NOT EXISTS idx_promocodes_code ON promocodes (code)").execute();
  app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_promocodes_partner_active ON promocodes (partner_id, is_active)").execute();
  app.db().newQuery("CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_partners_user ON affiliate_partners (user_id)").execute();
  app.db().newQuery("CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_partners_code ON affiliate_partners (referral_code)").execute();
  app.db().newQuery("CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_attributions_user ON affiliate_attributions (referred_user_id)").execute();
  app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_partner ON affiliate_attributions (partner_id, created DESC)").execute();
  app.db().newQuery("CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_commissions_invoice ON affiliate_commissions (stripe_invoice_id)").execute();
  app.db().newQuery("CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_commissions_attribution ON affiliate_commissions (attribution_id)").execute();
  app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_partner_status ON affiliate_commissions (partner_id, status, created DESC)").execute();
  app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_partner_status ON affiliate_payouts (partner_id, status, created DESC)").execute();
  app.db().newQuery("CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_payouts_reference ON affiliate_payouts (reference) WHERE reference != ''").execute();
}, (app) => {
  for (const name of [
    "affiliate_payouts",
    "affiliate_commissions",
    "affiliate_attributions",
    "affiliate_partners",
  ]) {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch (error) {
      // Already removed.
    }
  }

  try {
    const promocodes = app.findCollectionByNameOrId("promocodes");
    for (const field of [
      "partner_id",
      "internal_name",
      "reward_enabled",
      "reward_months",
      "commission_rate_bps",
    ]) {
      if (promocodes.fields.getByName(field)) promocodes.fields.removeByName(field);
    }
    app.save(promocodes);
  } catch (error) {
    // Promocodes may not exist in a fresh rollback.
  }
});
