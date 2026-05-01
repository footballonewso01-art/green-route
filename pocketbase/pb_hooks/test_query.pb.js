routerAdd("GET", "/api/test_query", (c) => {
    try {
        const result = new DynamicModel({ "id": "", "clicks": 0 });
        const rows = $app.db().newQuery("SELECT id, count(*) as clicks FROM links GROUP BY id LIMIT 1").all(result);
        return c.json(200, { rows: rows });
    } catch (e) {
        return c.json(500, { error: String(e) });
    }
});
