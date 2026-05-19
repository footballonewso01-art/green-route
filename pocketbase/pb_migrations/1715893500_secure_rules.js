/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  
  // SECURE USERS
  // Prevent any user from updating/deleting other users
  const users = dao.findCollectionByNameOrId("users");
  users.updateRule = "@request.auth.id = id";
  users.deleteRule = "@request.auth.id = id";
  dao.saveCollection(users);

  // SECURE BILLING
  // Prevent users from viewing/editing other users' billing records
  const billing = dao.findCollectionByNameOrId("billing");
  billing.listRule = "@request.auth.id = user_id";
  billing.viewRule = "@request.auth.id = user_id";
  billing.createRule = "@request.auth.id = user_id";
  billing.updateRule = "@request.auth.id = user_id";
  dao.saveCollection(billing);

  // SECURE LINKS
  // listRule: only owners can list their own links (prevents bulk scraping)
  // viewRule: public — required for RedirectHandler to resolve slugs for unauthenticated visitors
  const links = dao.findCollectionByNameOrId("links");
  links.listRule = "@request.auth.id = user_id";
  links.viewRule = "";
  dao.saveCollection(links);
}, (db) => {
  const dao = new Dao(db);
  
  const users = dao.findCollectionByNameOrId("users");
  users.updateRule = "@request.auth.id != ''";
  users.deleteRule = "@request.auth.id != ''";
  dao.saveCollection(users);

  const billing = dao.findCollectionByNameOrId("billing");
  billing.listRule = "@request.auth.id != ''";
  billing.viewRule = "@request.auth.id != ''";
  billing.createRule = "@request.auth.id != ''";
  billing.updateRule = "@request.auth.id != ''";
  dao.saveCollection(billing);

  const links = dao.findCollectionByNameOrId("links");
  links.listRule = "";
  links.viewRule = "";
  dao.saveCollection(links);
});
