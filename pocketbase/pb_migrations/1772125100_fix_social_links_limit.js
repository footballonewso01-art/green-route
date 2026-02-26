/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("users");

    const field = collection.schema.getFieldByName("social_links");
    if (field) {
        field.options = {
            "maxSize": 2000000
        };
        return dao.saveCollection(collection);
    }

    return null;
}, (db) => {
    // No-op for down migration in this context
    return null;
})
