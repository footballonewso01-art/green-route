/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7htjjwv9ii7y93r")

  collection.createRule = "@request.auth.id != \"\" && @request.auth.id = user_id"
  collection.updateRule = "@request.auth.id != \"\" && user_id = @request.auth.id"
  collection.deleteRule = "@request.auth.id != \"\" && user_id = @request.auth.id"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7htjjwv9ii7y93r")

  collection.createRule = ""
  collection.updateRule = ""
  collection.deleteRule = ""

  return dao.saveCollection(collection)
})
