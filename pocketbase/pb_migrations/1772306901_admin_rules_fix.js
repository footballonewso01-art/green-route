/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);

    // 1. Update users collection updateRule
    const usersCollection = dao.findCollectionByNameOrId("users");
    if (usersCollection) {
        // Explicitly allow updates if the requester's role is 'admin' OR if it is their own profile.
        usersCollection.updateRule = "@request.auth.role = 'admin' || id = @request.auth.id";
        dao.saveCollection(usersCollection);
    }

    // 2. Update billing collection create/update rules
    const billingCollection = dao.findCollectionByNameOrId("billing");
    if (billingCollection) {
        // Allows creating a billing record for anyone as long as the requester is logged in AND is an admin
        billingCollection.createRule = "@request.auth.role = 'admin'";
        dao.saveCollection(billingCollection);
    }
}, (db) => {
    // Revert
    const dao = new Dao(db);
    const usersCollection = dao.findCollectionByNameOrId("users");
    if (usersCollection) {
        usersCollection.updateRule = "@request.auth.role = \"admin\" || id = @request.auth.id";
        dao.saveCollection(usersCollection);
    }

    const billingCollection = dao.findCollectionByNameOrId("billing");
    if (billingCollection) {
        billingCollection.createRule = "@request.auth.id != \"\"";
        dao.saveCollection(billingCollection);
    }
});
