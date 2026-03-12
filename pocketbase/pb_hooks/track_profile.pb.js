// Track Profile Views (Public, unauthenticated)
routerAdd("POST", "/api/pv", (c) => {
    try {
        const username = c.request.url.query().get("u");
        if (!username) {
            return c.json(400, { error: "missing u param" });
        }
        
        // PocketBase filters don't support LOWER() function directly in findFirstRecordByFilter
        // We will query by the exact username passed, or if case-insensitivity is strictly required,
        // we use ~ (LIKE) and find the exact match in JS.
        const records = $app.findRecordsByFilter("users", "username ~ {:username}", "-created", 10, 0, { username: username });
        let user = null;
        for (let i = 0; i < records.length; i++) {
            if (records[i].get("username").toLowerCase() === username.toLowerCase()) {
                user = records[i];
                break;
            }
        }
        
        if (!user) {
            return c.json(404, { success: false, error: "User not found" });
        }
        
        let currentViews = user.get("profile_views") || 0;
        user.set("profile_views", currentViews + 1);
        $app.save(user);
        
        return c.json(200, { success: true, views: currentViews + 1 });
    } catch (err) {
        $app.logger().error("TRACK_PROFILE ERROR: " + String(err));
        return c.json(500, { success: false, error: String(err) });
    }
});
