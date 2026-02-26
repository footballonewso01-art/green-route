/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("users");

    collection.schema.addField(new SchemaField({
        "system": false,
        "id": "custom_theme_bg_id",
        "name": "custom_theme_bg",
        "type": "file",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "maxSelect": 1,
            "maxSize": 5242880,
            "mimeTypes": [
                "image/jpeg",
                "image/png",
                "image/svg+xml",
                "image/gif",
                "image/webp"
            ],
            "thumbs": [
                "100x100"
            ],
            "protected": false
        }
    }));

    return dao.saveCollection(collection);
}, (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("users");

    collection.schema.removeField("custom_theme_bg");

    return dao.saveCollection(collection);
})
