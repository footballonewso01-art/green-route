migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  if (users.fields.getByName("promocode_used")) return;

  const promocodes = app.findCollectionByNameOrId("promocodes");
  users.fields.add(new RelationField({
    name: "promocode_used",
    required: false,
    collectionId: promocodes.id,
    maxSelect: 1,
    cascadeDelete: false,
  }));
  app.save(users);
}, (app) => {
  // The field predates this migration in production. Keep rollback
  // non-destructive rather than guessing whether this migration created it.
});
