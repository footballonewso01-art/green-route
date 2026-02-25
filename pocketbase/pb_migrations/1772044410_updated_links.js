/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7htjjwv9ii7y93r")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "whv4b8p9",
    "name": "interstitial_enabled",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7htjjwv9ii7y93r")

  // remove
  collection.schema.removeField("whv4b8p9")

  return dao.saveCollection(collection)
})
