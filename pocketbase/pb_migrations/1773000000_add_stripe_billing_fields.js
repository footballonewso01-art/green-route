/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const collection = new Collection({
        "id": "1o22lsxixr8x6g3", // ID of the billing collection
        "name": "billing",
        "type": "base",
        "system": false,
        "schema": [
            {
                "system": false,
                "id": "s22xt6f8",
                "name": "stripe_customer_id",
                "type": "text",
                "required": false,
                "presentable": false,
                "unique": false,
                "options": {
                    "min": null,
                    "max": 255,
                    "pattern": ""
                }
            },
            {
                "system": false,
                "id": "tx8e5qaz",
                "name": "stripe_subscription_id",
                "type": "text",
                "required": false,
                "presentable": false,
                "unique": false,
                "options": {
                    "min": null,
                    "max": 255,
                    "pattern": ""
                }
            }
        ],
    });

    const dao = new Dao(db);
    const existingCollection = dao.findCollectionByNameOrId("billing");

    existingCollection.schema.addField(new SchemaField({
        "system": false,
        "id": "s22xt6f8",
        "name": "stripe_customer_id",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": null,
            "max": 255,
            "pattern": ""
        }
    }));

    existingCollection.schema.addField(new SchemaField({
        "system": false,
        "id": "tx8e5qaz",
        "name": "stripe_subscription_id",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": null,
            "max": 255,
            "pattern": ""
        }
    }));

    return dao.saveCollection(existingCollection);
}, (db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("billing");

    collection.schema.removeField("s22xt6f8");
    collection.schema.removeField("tx8e5qaz");

    return dao.saveCollection(collection);
})
