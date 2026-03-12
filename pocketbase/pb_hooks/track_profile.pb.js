// Simple test route — no path params
routerAdd("GET", "/api/track-test", (c) => {
    return c.json(200, { test: true });
});

// Track Profile Views (Public, unauthenticated)
routerAdd("GET", "/api/track/profile/:username", (c) => {
    const username = c.pathParam("username");
    
    try {
        const user = $app.findFirstRecordByFilter("users", "LOWER(username) = {:username}", { username: username.toLowerCase() });
        let currentViews = user.get("profile_views") || 0;
        user.set("profile_views", currentViews + 1);
        $app.save(user);
        return c.json(200, { success: true, views: currentViews + 1 });
    } catch (err) {
        return c.json(200, { success: false, error: String(err) });
    }
});
