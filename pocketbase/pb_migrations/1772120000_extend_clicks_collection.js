/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const collection = new Dao(db).findCollectionByNameOrId("clicks");

    // add os
    collection.schema.addField(new SchemaField({
        "name": "os",
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

    // add browser
    collection.schema.addField(new SchemaField({
        "name": "browser",
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

    // add referrer
    collection.schema.addField(new SchemaField({
        "name": "referrer",
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

    // add is_unique
    collection.schema.addField(new SchemaField({
        "name": "is_unique",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
    }));

    return new Dao(db).saveCollection(collection);
}, (db) => {
    const collection = new Dao(db).findCollectionByNameOrId("clicks");

    collection.schema.removeField("os");
    collection.schema.removeField("browser");
    collection.schema.removeField("referrer");
    collection.schema.removeField("is_unique");

    return new Dao(db).saveCollection(collection);
})
