migrate((app) => {
  try {
    // Check if already exists
    try {
      const existing = app.findCollectionByNameOrId("analytics_daily");
      if (existing) {
        console.log("analytics_daily already exists, skipping create");
        return;
      }
    } catch (e) {
      // Collection not found — proceed to create
    }

    const collection = new Collection({
      name: "analytics_daily",
      type: "view",
      viewQuery: `
        SELECT 
          (row_number() over()) as id, 
          link_id, 
          date(created) as day, 
          count(id) as count 
        FROM clicks 
        GROUP BY link_id, date(created)
      `,
      listRule: '@request.auth.id != "" && link_id.user_id = @request.auth.id',
      viewRule: '@request.auth.id != "" && link_id.user_id = @request.auth.id',
    });

    app.save(collection);
    console.log("Successfully created analytics_daily view collection");
  } catch (err) {
    console.error("FAILED to create analytics_daily view:", err);
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("analytics_daily");
    if (collection) {
      app.delete(collection);
    }
  } catch (e) {}
});
