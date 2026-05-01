migrate((db) => {
    try {
        const clicksCollection = $app.findCollectionByNameOrId("clicks");
        if (!clicksCollection.indexes) clicksCollection.indexes = [];
        
        let hasChanges = false;
        
        const linkIndex = "CREATE INDEX `idx_clicks_link` ON `clicks` (`link_id`)";
        const createdIndex = "CREATE INDEX `idx_clicks_created` ON `clicks` (`created`)";
        
        if (!clicksCollection.indexes.includes(linkIndex)) {
            clicksCollection.indexes.push(linkIndex);
            hasChanges = true;
        }
        
        if (!clicksCollection.indexes.includes(createdIndex)) {
            clicksCollection.indexes.push(createdIndex);
            hasChanges = true;
        }

        if (hasChanges) {
            $app.save(clicksCollection);
            console.log("Migration: Added indexes to 'clicks' collection");
        }
    } catch (e) {
        console.error("Migration error (clicks indexes):", e);
    }
    
    try {
        const linksCollection = $app.findCollectionByNameOrId("links");
        if (!linksCollection.indexes) linksCollection.indexes = [];
        
        const userIndex = "CREATE INDEX `idx_links_user` ON `links` (`user_id`)";
        
        if (!linksCollection.indexes.includes(userIndex)) {
            linksCollection.indexes.push(userIndex);
            $app.save(linksCollection);
            console.log("Migration: Added indexes to 'links' collection");
        }
    } catch (e) {
        console.error("Migration error (links indexes):", e);
    }
}, (db) => {
    try {
        const clicksCollection = $app.findCollectionByNameOrId("clicks");
        if (clicksCollection.indexes) {
            clicksCollection.indexes = clicksCollection.indexes.filter(idx => 
                !idx.includes("idx_clicks_link") && !idx.includes("idx_clicks_created")
            );
            $app.save(clicksCollection);
        }
        
        const linksCollection = $app.findCollectionByNameOrId("links");
        if (linksCollection.indexes) {
            linksCollection.indexes = linksCollection.indexes.filter(idx => 
                !idx.includes("idx_links_user")
            );
            $app.save(linksCollection);
        }
    } catch (e) {
        // Ignore revert errors
    }
});
