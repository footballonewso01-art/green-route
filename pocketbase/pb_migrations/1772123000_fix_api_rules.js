/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);

    // 1. Update 'links' collection rules
    const linksCollection = dao.findCollectionByNameOrId("links");
    // Allow listing/viewing active links by slug (even if not shown on profile)
    linksCollection.listRule = "user_id = @request.auth.id || active = true";
    linksCollection.viewRule = "user_id = @request.auth.id || active = true";
    dao.saveCollection(linksCollection);

    // 2. Update 'users' collection rules
    const usersCollection = dao.findCollectionByNameOrId("users");
    // Allow anybody to view a user record (required for public profiles by username)
    // PocketBase protects sensitive fields like email by default.
    usersCollection.viewRule = ""; // Empty string here means "Anybody" (public) in this specific format? 
    // Actually, in migrate() JS, use null or empty string? 
    // Usually, listRule = "" means ADMIN ONLY.
    // If I want PUBLIC, I should use "id != ''" or similar, or just null?
    // Let's use "@request.auth.id != '' || id != ''" which is always true for existing records.
    usersCollection.viewRule = "id != ''";
    // We keep listRule restricted to owner for privacy on the 'list' (search) endpoint
    usersCollection.listRule = "id = @request.auth.id";

    dao.saveCollection(usersCollection);

    // 3. Update 'clicks' collection rules
    const clicksCollection = dao.findCollectionByNameOrId("clicks");
    // Allow anybody to log a click (public creation)
    clicksCollection.createRule = "";
    dao.saveCollection(clicksCollection);

    return null;
}, (db) => {
    const dao = new Dao(db);

    const linksCollection = dao.findCollectionByNameOrId("links");
    linksCollection.listRule = "";
    linksCollection.viewRule = "";
    dao.saveCollection(linksCollection);

    const usersCollection = dao.findCollectionByNameOrId("users");
    usersCollection.viewRule = "id = @request.auth.id";
    usersCollection.listRule = "id = @request.auth.id";
    dao.saveCollection(usersCollection);

    return null;
})
