/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("users");

    collection.schema.addField(new SchemaField({
        "system": false,
        "id": "username_last_changed",
        "name": "username_last_changed",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
    }));

    return dao.saveCollection(collection);
}, (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("users");
    collection.schema.removeField("username_last_changed");
    return dao.saveCollection(collection);
})
