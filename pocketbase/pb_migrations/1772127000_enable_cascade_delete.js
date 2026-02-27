/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);
    const collection = dao.findCollectionByNameOrId("links");

    // Find the user_id field
    const userIdField = collection.schema.fields().find(f => f.name === "user_id");
    if (userIdField) {
        // Update to cascade delete
        userIdField.options.cascadeDelete = true;
    }

    return dao.saveCollection(collection);
}, (db) => {
    return null;
})
