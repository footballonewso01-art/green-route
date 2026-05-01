migrate((db) => {
  const collection = new Collection({
    "id": "viewanalyticsdaily",
    "created": "2024-01-01 00:00:00.000Z",
    "updated": "2024-01-01 00:00:00.000Z",
    "name": "analytics_daily",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "view_link_id",
        "name": "link_id",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "7htjjwv9ii7y93r",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "view_day",
        "name": "day",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "view_count",
        "name": "count",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": true
        }
      }
    ],
    "indexes": [],
    "listRule": "@request.auth.id != \"\" && link_id.user_id = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && link_id.user_id = @request.auth.id",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {
      "query": "SELECT \n  min(id) as id, \n  link_id, \n  date(created) as day, \n  count(id) as count \nFROM clicks \nGROUP BY link_id, date(created)"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("analytics_daily");

  return dao.deleteCollection(collection);
})
