/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);

    // Try to drop columns directly via SQL if they exist to clean up the state
    try {
        db.newQuery("ALTER TABLE links DROP COLUMN icon_type").execute();
    } catch (e) { }
    try {
        db.newQuery("ALTER TABLE links DROP COLUMN icon_value").execute();
    } catch (e) { }
    try {
        db.newQuery("ALTER TABLE links DROP COLUMN icon_color").execute();
    } catch (e) { }

    const collection = dao.findCollectionByNameOrId("links");

    // Re-add fields via PocketBase Schema
    collection.schema.addField(new SchemaField({
        "system": false,
        "id": "icon_type_fixed",
        "name": "icon_type",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "maxSelect": 1,
            "values": [
                "preset",
                "emoji",
                "custom",
                "none"
            ]
        }
    }));

    collection.schema.addField(new SchemaField({
        "system": false,
        "id": "icon_value_fixed",
        "name": "icon_value",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": null,
            "max": null,
            "pattern": ""
        }
    }));

    collection.schema.addField(new SchemaField({
        "system": false,
        "id": "icon_color_fixed",
        "name": "icon_color",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": null,
            "max": null,
            "pattern": ""
        }
    }));

    return dao.saveCollection(collection);
}, (db) => {
    return null;
})
