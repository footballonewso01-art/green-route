routerAdd("GET", "/api/analytics/sparklines", (c) => {
    try {
        const user = c.auth;
        if (!user || user.collection().name !== "users") {
            return c.json(401, { message: "Unauthorized" });
        }

        const dateLimit = new Date();
        dateLimit.setUTCDate(dateLimit.getUTCDate() - 6);
        dateLimit.setUTCHours(0, 0, 0, 0);
        
        // SQLite format expected by PB
        const dateLimitStr = dateLimit.toISOString().replace("T", " ");

        const queryStr = `
            SELECT link_id, date(created) as day, count(id) as count 
            FROM clicks 
            WHERE created >= {:dateLimit} 
            AND link_id IN (SELECT id FROM links WHERE user_id = {:userId})
            GROUP BY link_id, date(created)
        `;

        const result = new DynamicModel({
            "link_id": "",
            "day": "",
            "count": 0
        });

        const rows = $app.db().newQuery(queryStr)
            .bind({
                "userId": user.id,
                "dateLimit": dateLimitStr
            })
            .all(result);

        const responseItems = rows.map(r => ({
            link_id: r.link_id,
            day: r.day,
            count: r.count
        }));

        return c.json(200, { items: responseItems });
    } catch (err) {
        $app.logger().error("Analytics Sparklines error: " + String(err));
        return c.json(500, { message: "Failed to fetch analytics", error: String(err) });
    }
});
