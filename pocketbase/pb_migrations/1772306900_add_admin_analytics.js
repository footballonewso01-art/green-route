/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const analyticsCollection = new Collection({
        "name": "analytics_events",
        "type": "base",
        "schema": [
            {
                "name": "event_name",
                "type": "text",
                "required": true
            },
            {
                "name": "user_id",
                "type": "relation",
                "options": {
                    "collectionId": "_pb_users_auth_",
                    "maxSelect": 1,
                    "cascadeDelete": true
                }
            },
            {
                "name": "metadata",
                "type": "json"
            }
        ],
        "listRule": "@request.auth.role = 'admin'",
        "viewRule": "@request.auth.role = 'admin'",
        "createRule": "",
        "updateRule": "@request.auth.role = 'admin'",
        "deleteRule": "@request.auth.role = 'admin'"
    });

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

    return Dao(db).saveCollection(analyticsCollection) && Dao(db).saveCollection(logsCollection);
}, (db) => {
    const dao = new Dao(db);
    try {
        const analytics = dao.findCollectionByNameOrId("analytics_events");
        dao.deleteCollection(analytics);
    } catch (e) { }
    try {
        const logs = dao.findCollectionByNameOrId("system_logs");
        dao.deleteCollection(logs);
    } catch (e) { }
});
