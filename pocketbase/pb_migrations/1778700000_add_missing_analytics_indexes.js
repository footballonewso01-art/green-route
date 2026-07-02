migrate((app) => {
    try {
        app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_clicks_created ON clicks (created)").execute();
        app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_clicks_country ON clicks (country)").execute();
        app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events (created)").execute();
        app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events (event_name)").execute();
        app.db().newQuery("CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events (user_id)").execute();
        console.log("Analytics and clicks database indexes successfully created!");
    } catch (err) {
        console.error("Failed to create database indexes:", err);
    }
}, (app) => {})
