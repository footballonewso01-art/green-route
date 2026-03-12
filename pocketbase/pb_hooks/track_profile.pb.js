// Track Profile Views (Public, unauthenticated)
// Using /pv/:username without /api prefix to avoid PB internal router conflicts
routerAdd("GET", "/pv/:username", (c) => {
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
