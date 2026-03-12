// ==========================================
// SELF-HEALING MIGRATION: Ensure profile_views exists
// ==========================================
try {
    const usersColl = $app.findCollectionByNameOrId("users");
    // Check if field exists in schema
    const fields = usersColl.schema.fields();
    let hasField = false;
    for (let f of fields) {
        if (f.name === "profile_views") {
            hasField = true;
            break;
        }
    }

    if (!hasField) {
        $app.logger().info("Migration: Adding profile_views field to users...");
        // Add field via PB Schema API
        usersColl.schema.addField({
            "name": "profile_views",
            "type": "number",
            "options": { "noDecimal": true }
        });
        $app.saveCollection(usersColl);
        $app.logger().info("Migration: profile_views field added.");
    }
} catch (e) {
    $app.logger().warn("Migration Note: " + e.message);
}

// Track Profile Views (Public, unauthenticated)
routerAdd(["GET", "POST", "OPTIONS"], "/api/pv", (c) => {
    // CORS Support
    c.response().header().set("Access-Control-Allow-Origin", "*");
    c.response().header().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    c.response().header().set("Access-Control-Allow-Headers", "Content-Type");

    if (c.request().method === "OPTIONS") {
        return c.noContent(204);
    }

    try {
        const username = c.request.url.query().get("u");
        if (!username) {
            return c.json(400, { success: false, error: "missing u param" });
        }
        
        // Find user by username (case-insensitive search)
        const records = $app.findRecordsByFilter("users", "username ~ {:username}", "-created", 1, 0, { username: username });
        if (records.length === 0) {
            return c.json(404, { success: false, error: "User not found" });
        }
        
        const user = records[0];
        
        // Increment and save
        const currentViews = user.get("profile_views") || 0;
        user.set("profile_views", currentViews + 1);
        $app.save(user);
        
        return c.json(200, { success: true, views: currentViews + 1 });
    } catch (err) {
        $app.logger().error("TRACK_PROFILE ERROR: " + String(err));
        return c.json(500, { success: false, error: String(err) });
    }
});
