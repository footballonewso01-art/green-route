/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);
    const users = dao.findRecordsByFilter("users", "id != ''");

    for (const user of users) {
        if (!user.get("plan")) {
            user.set("plan", "creator");
            user.set("plan_status", "active");
            dao.saveRecord(user);
        }
    }

    return null;
}, (db) => {
    return null;
})
