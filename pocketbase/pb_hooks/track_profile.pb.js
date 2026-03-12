// Track Profile Views (Public, unauthenticated)
// Using query param ?u=username to avoid PB path routing conflicts
routerAdd("GET", "/api/pv", (c) => {
    try {
        const username = c.request.url.query().get("u");
        if (!username) {
            return c.json(400, { error: "missing u param" });
        }
        
        const user = $app.findFirstRecordByFilter("users", "LOWER(username) = {:username}", { username: username.toLowerCase() });
        let currentViews = user.get("profile_views") || 0;
        user.set("profile_views", currentViews + 1);
        $app.save(user);
        return c.json(200, { success: true, views: currentViews + 1, user: username });
    } catch (err) {
        return c.json(500, { success: false, error: String(err) });
    }
});
