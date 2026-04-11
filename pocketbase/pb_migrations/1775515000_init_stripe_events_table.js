// pocketbase/pb_migrations/1775515000_init_stripe_events_table.js

migrate((app) => {
    try {
        app.db().newQuery("CREATE TABLE IF NOT EXISTS _processed_stripe_events (id TEXT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)").execute();
    } catch (err) {
        console.error("Failed to init _processed_stripe_events table in migration: " + err);
    }
}, (app) => {
    // Optional: add drop table logic if needed
    // app.db().newQuery("DROP TABLE IF EXISTS _processed_stripe_events").execute();
});
