/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const dao = new Dao(db);
    const links = dao.findRecordsByFilter("links", "id != ''");

    for (const link of links) {
        link.set("icon_type", "preset");
        link.set("icon_value", "tiktok");
        dao.saveRecord(link);
    }

    return null;
}, (db) => {
    return null;
})
