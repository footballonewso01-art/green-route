/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // SECURE USERS
  // Prevent any user from updating/deleting other users
  const users = app.findCollectionByNameOrId("users");
  users.updateRule = "@request.auth.id = id";
  users.deleteRule = "@request.auth.id = id";
  app.save(users);

  // SECURE BILLING
  // Prevent users from viewing/editing other users' billing records
  const billing = app.findCollectionByNameOrId("billing");
  billing.listRule = "@request.auth.id = user_id";
  billing.viewRule = "@request.auth.id = user_id";
  billing.createRule = "@request.auth.id = user_id";
  billing.updateRule = "@request.auth.id = user_id";
  app.save(billing);

  // SECURE LINKS
  // listRule: public — required for RedirectHandler to resolve slugs for unauthenticated visitors
  // viewRule: public — required for RedirectHandler to resolve slugs for unauthenticated visitors
  const links = app.findCollectionByNameOrId("links");
  links.listRule = "";
  links.viewRule = "";
  app.save(links);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.updateRule = "@request.auth.id != ''";
  users.deleteRule = "@request.auth.id != ''";
  app.save(users);

  const billing = app.findCollectionByNameOrId("billing");
  billing.listRule = "@request.auth.id != ''";
  billing.viewRule = "@request.auth.id != ''";
  billing.createRule = "@request.auth.id != ''";
  billing.updateRule = "@request.auth.id != ''";
  app.save(billing);

  const links = app.findCollectionByNameOrId("links");
  links.listRule = "";
  links.viewRule = "";
  app.save(links);
});
