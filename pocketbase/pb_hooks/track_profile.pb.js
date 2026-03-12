// Track Profile Views (Public, unauthenticated)
routerAdd("GET", "/api/pv", (c) => {
    let step = 1;
    let dbgUser = "";
    try {
        const username = c.request.url.query().get("u");
        step = 2;
        if (!username) {
            return c.json(400, { error: "missing u param" });
        }
        dbgUser = username.toLowerCase();
        
        step = 3;
        const user = $app.findFirstRecordByFilter("users", "LOWER(username) = {:username}", { username: dbgUser });
        
        step = 4;
        let currentViews = user.get("profile_views") || 0;
        
        step = 5;
        user.set("profile_views", currentViews + 1);
        
        step = 6;
        // Try without save first to see if save is panicking
        // $app.save(user); // commented out for debug run
        
        step = 7;
        return c.json(200, { success: true, step: step, views: currentViews + 1, user: dbgUser });
    } catch (err) {
        return c.json(500, { success: false, step: step, user: dbgUser, error: String(err) });
    }
});
