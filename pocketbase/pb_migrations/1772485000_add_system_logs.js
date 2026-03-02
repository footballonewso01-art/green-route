/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);

    try {
        const existing = dao.findCollectionByNameOrId("system_logs");
        return; // Already exists
    } catch (e) {
        // Continue to create
    }

    const logsCollection = new Collection({
        "name": "system_logs",
        "type": "base",
        "schema": [
            {
                "name": "level",
                "type": "text",
                "required": true
            },
            {
                "name": "message",
                "type": "text"
            },
            {
                "name": "latency",
                "type": "number"
            },
            {
                "name": "endpoint",
                "type": "text"
            },
            {
                "name": "context",
                "type": "json"
            }
        ],
        "listRule": "@request.auth.role = 'admin'",
        "viewRule": "@request.auth.role = 'admin'",
        "createRule": "",
        "updateRule": "@request.auth.role = 'admin'",
        "deleteRule": "@request.auth.role = 'admin'"
    });

    return dao.saveCollection(logsCollection);
}, (db) => {
    const dao = new Dao(db);
    try {
        const logs = dao.findCollectionByNameOrId("system_logs");
        dao.deleteCollection(logs);
    } catch (e) { }
});
