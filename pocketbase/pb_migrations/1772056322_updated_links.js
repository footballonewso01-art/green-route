/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7htjjwv9ii7y93r")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rxjpe2vz",
    "name": "mode",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7htjjwv9ii7y93r")

  // remove
  collection.schema.removeField("rxjpe2vz")

  return dao.saveCollection(collection)
})
