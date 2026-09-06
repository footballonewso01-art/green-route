migrate((app) => {
  const billing = app.findCollectionByNameOrId("billing");
  const amount = billing.fields.getByName("amount");
  if (amount && amount.required) {
    // PocketBase treats numeric zero as empty for a required NumberField.
    // Free Trial/Given rows are server-only and intentionally carry amount=0.
    amount.required = false;
    app.save(billing);
  }
}, (app) => {
  const billing = app.findCollectionByNameOrId("billing");
  const amount = billing.fields.getByName("amount");
  if (amount && !amount.required) {
    amount.required = true;
    app.save(billing);
  }
});
