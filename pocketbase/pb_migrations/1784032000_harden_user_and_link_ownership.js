migrate((app) => {
  const links = app.findCollectionByNameOrId("links");

  // Defense in depth: the hook returns a clear error, while this API rule
  // independently rejects owner spoofing if hooks are ever unavailable.
  links.createRule = "@request.auth.id != '' && (@request.auth.id = user_id || @request.auth.role = 'admin')";
  app.save(links);
}, (app) => {
  const links = app.findCollectionByNameOrId("links");
  links.createRule = "@request.auth.id != ''";
  app.save(links);
});
