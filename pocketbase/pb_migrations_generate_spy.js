const fs = require('fs');
const timestamp = Math.floor(Date.now() / 1000);
const content = `/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Dao(db).findCollectionByNameOrId("links");

  // system_route_override
  const overrideField = new SchemaField({
    "system": false,
    "id": "sys_rte_ovr",
    "name": "system_route_override",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  });

  // system_route_active
  const activeField = new SchemaField({
    "system": false,
    "id": "sys_rte_act",
    "name": "system_route_active",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  });

  collection.schema.addField(overrideField);
  collection.schema.addField(activeField);

  return Dao(db).saveCollection(collection);
}, (db) => {
  const collection = new Dao(db).findCollectionByNameOrId("links");

  collection.schema.removeField("sys_rte_ovr");
  collection.schema.removeField("sys_rte_act");

  return Dao(db).saveCollection(collection);
})
`;
fs.writeFileSync(`pocketbase/pb_migrations/${timestamp}_add_spy_fields.js`, content);
console.log("Migration created!");
