/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("users");

    collection.schema.addField(new SchemaField({
        "system": false,
        "id": "social_links_json",
        "name": "social_links",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
    }));

    return dao.saveCollection(collection);
}, (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("users");

    collection.schema.removeField("social_links_json");

    return dao.saveCollection(collection);
})
