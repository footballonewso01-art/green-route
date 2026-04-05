/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("users");

    collection.schema.addField(new SchemaField({
        "system": false,
        "id": "card_color_id",
        "name": "card_color",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": null,
            "max": 7,
            "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
        }
    }));

    return dao.saveCollection(collection);
}, (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("users");
    collection.schema.removeField("card_color_id");
    return dao.saveCollection(collection);
})
