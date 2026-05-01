migrate((db) => {
    try {
        const linksCollection = $app.findCollectionByNameOrId("links");
        if (!linksCollection.fields.getByName("domain")) {
            linksCollection.fields.add(new Field({
                name: "domain",
                type: "text",
                required: false,
            }));
            $app.save(linksCollection);
            console.log("Migration: Added 'domain' field to 'links'");
        }
    } catch (e) {
        console.error("Migration error (links.domain):", e);
    }
    
    try {
        const usersCollection = $app.findCollectionByNameOrId("users");
        if (!usersCollection.fields.getByName("created_ip")) {
            usersCollection.fields.add(new Field({
                name: "created_ip",
                type: "text",
                required: false,
            }));
            $app.save(usersCollection);
            console.log("Migration: Added 'created_ip' field to 'users'");
        }
    } catch (e) {
        console.error("Migration error (users.created_ip):", e);
    }
}, (db) => {
    try {
        const linksCollection = $app.findCollectionByNameOrId("links");
        if (linksCollection.fields.getByName("domain")) {
            linksCollection.fields.removeByName("domain");
            $app.save(linksCollection);
        }
        
        const usersCollection = $app.findCollectionByNameOrId("users");
        if (usersCollection.fields.getByName("created_ip")) {
            usersCollection.fields.removeByName("created_ip");
            $app.save(usersCollection);
        }
    } catch (e) {
        // Ignore revert errors
    }
});
