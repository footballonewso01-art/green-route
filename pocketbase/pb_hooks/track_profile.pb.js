// Track Profile Views (Public, unauthenticated)
// Isolated into its own file to guarantee loading even if main.pb.js has issues
routerAdd("GET", "/api/track/profile/:username", (c) => {
    const username = c.pathParam("username");
    
    try {
        const user = $app.findFirstRecordByFilter("users", "LOWER(username) = {:username}", { username: username.toLowerCase() });
        let currentViews = user.get("profile_views") || 0;
        user.set("profile_views", currentViews + 1);
        $app.save(user);
        return c.json(200, { success: true, views: currentViews + 1 });
    } catch (err) {
        // User not found or DB error
        return c.json(200, { success: false, error: String(err) });
    }
});
