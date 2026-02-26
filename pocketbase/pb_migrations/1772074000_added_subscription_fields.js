/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("users");

    collection.schema.addField(new SchemaField({
        "system": false,
        "id": "plan_type_id",
        "name": "plan",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "maxSelect": 1,
            "values": [
                "creator",
                "pro",
                "agency"
            ]
        }
    }));

    collection.schema.addField(new SchemaField({
        "system": false,
        "id": "plan_status_id",
        "name": "plan_status",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "maxSelect": 1,
            "values": [
                "active",
                "trial",
                "expired",
                "cancelled"
            ]
        }
    }));

    collection.schema.addField(new SchemaField({
        "system": false,
        "id": "plan_expires_at_id",
        "name": "plan_expires_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": "",
            "max": ""
        }
    }));

    collection.schema.addField(new SchemaField({
        "system": false,
        "id": "stripe_customer_id",
        "name": "stripe_customer_id",
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
        "id": "stripe_sub_id",
        "name": "stripe_subscription_id",
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
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("users");

    collection.schema.removeField("plan");
    collection.schema.removeField("plan_status");
    collection.schema.removeField("plan_expires_at");
    collection.schema.removeField("stripe_customer_id");
    collection.schema.removeField("stripe_subscription_id");

    return dao.saveCollection(collection);
})
