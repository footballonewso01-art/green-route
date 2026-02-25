/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vx9gk68kkwd9g5z")

  collection.listRule = "@request.auth.id != \"\" && link_id.user_id = @request.auth.id"
  collection.viewRule = "@request.auth.id != \"\" && link_id.user_id = @request.auth.id"
  collection.updateRule = "@request.auth.id != \"\" && link_id.user_id = @request.auth.id"
  collection.deleteRule = "@request.auth.id != \"\" && link_id.user_id = @request.auth.id"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vx9gk68kkwd9g5z")

  collection.listRule = ""
  collection.viewRule = ""
  collection.updateRule = ""
  collection.deleteRule = ""

  return dao.saveCollection(collection)
})
