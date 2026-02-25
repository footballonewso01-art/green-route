/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7htjjwv9ii7y93r")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "3p6gi8fi",
    "name": "title",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gtpxzlre",
    "name": "order",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "g2qftr1v",
    "name": "show_on_profile",
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
  collection.schema.removeField("3p6gi8fi")

  // remove
  collection.schema.removeField("gtpxzlre")

  // remove
  collection.schema.removeField("g2qftr1v")

  return dao.saveCollection(collection)
})
