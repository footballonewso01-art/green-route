migrate((app) => {
    let promoId = "pbc_211886784";
    let usersId = "_pb_users_auth_";

    // 1. Create promocodes collection if it doesn't exist
    try {
        const existing = app.findCollectionByNameOrId("promocodes");
        promoId = existing.id;
    } catch (e) {
        // Collection doesn't exist, create it
        const promocodes = new Collection({
            id: promoId,
            name: "promocodes",
            type: "base",
            system: false,
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: null,
            fields: [
                {
                    "autogeneratePattern": "[a-z0-9]{15}",
                    "hidden": false,
                    "id": "text3208210256",
                    "max": 15,
                    "min": 15,
                    "name": "id",
                    "pattern": "^[a-z0-9]+$",
                    "presentable": false,
                    "primaryKey": true,
                    "required": true,
                    "system": true,
                    "type": "text"
                },
                {
                    "autogeneratePattern": "",
                    "hidden": false,
                    "id": "text1997877400",
                    "max": 50,
                    "min": 0,
                    "name": "code",
                    "pattern": "",
                    "presentable": false,
                    "primaryKey": false,
                    "required": true,
                    "system": false,
                    "type": "text"
                },
                {
                    "hidden": false,
                    "id": "number2247082791",
                    "max": null,
                    "min": null,
                    "name": "max_uses",
                    "onlyInt": false,
                    "presentable": false,
                    "required": false,
                    "system": false,
                    "type": "number"
                },
                {
                    "hidden": false,
                    "id": "number891785145",
                    "max": null,
                    "min": null,
                    "name": "current_uses",
                    "onlyInt": false,
                    "presentable": false,
                    "required": false,
                    "system": false,
                    "type": "number"
                },
                {
                    "hidden": false,
                    "id": "select3695954918",
                    "maxSelect": 1,
                    "name": "reward_plan",
                    "presentable": false,
                    "required": true,
                    "system": false,
                    "type": "select",
                    "values": [
                        "pro",
                        "agency"
                    ]
                },
                {
                    "hidden": false,
                    "id": "number3941952765",
                    "max": null,
                    "min": 1,
                    "name": "reward_days",
                    "onlyInt": false,
                    "presentable": false,
                    "required": true,
                    "system": false,
                    "type": "number"
                },
                {
                    "hidden": false,
                    "id": "bool458715613",
                    "name": "is_active",
                    "presentable": false,
                    "required": false,
                    "system": false,
                    "type": "bool"
                },
                {
                    "hidden": false,
                    "id": "autodate2990389176",
                    "name": "created",
                    "onCreate": true,
                    "onUpdate": false,
                    "presentable": false,
                    "system": false,
                    "type": "autodate"
                },
                {
                    "hidden": false,
                    "id": "autodate3332085495",
                    "name": "updated",
                    "onCreate": true,
                    "onUpdate": true,
                    "presentable": false,
                    "system": false,
                    "type": "autodate"
                }
            ],
            indexes: [
                "CREATE UNIQUE INDEX \"idx_promocode_code\" ON \"promocodes\" (\"code\")"
            ]
        });
        app.save(promocodes);
    }

    // 2. Create promocode_logs collection if it doesn't exist
    try {
        app.findCollectionByNameOrId("promocode_logs");
    } catch (e) {
        const logs = new Collection({
            id: "pbc_126925138",
            name: "promocode_logs",
            type: "base",
            system: false,
            listRule: "",
            viewRule: "",
            createRule: null,
            updateRule: null,
            deleteRule: null,
            fields: [
                {
                    "autogeneratePattern": "[a-z0-9]{15}",
                    "hidden": false,
                    "id": "text3208210256",
                    "max": 15,
                    "min": 15,
                    "name": "id",
                    "pattern": "^[a-z0-9]+$",
                    "presentable": false,
                    "primaryKey": true,
                    "required": true,
                    "system": true,
                    "type": "text"
                },
                {
                    "cascadeDelete": false,
                    "collectionId": promoId,
                    "hidden": false,
                    "id": "relation3345745625",
                    "maxSelect": 1,
                    "minSelect": 0,
                    "name": "promocode_id",
                    "presentable": false,
                    "required": true,
                    "system": false,
                    "type": "relation"
                },
                {
                    "cascadeDelete": true,
                    "collectionId": usersId,
                    "hidden": false,
                    "id": "relation2809058197",
                    "maxSelect": 1,
                    "minSelect": 0,
                    "name": "user_id",
                    "presentable": false,
                    "required": true,
                    "system": false,
                    "type": "relation"
                },
                {
                    "autogeneratePattern": "",
                    "hidden": false,
                    "id": "text1624933099",
                    "max": 0,
                    "min": 0,
                    "name": "plan_awarded",
                    "pattern": "",
                    "presentable": false,
                    "primaryKey": false,
                    "required": true,
                    "system": false,
                    "type": "text"
                },
                {
                    "hidden": false,
                    "id": "number3450240341",
                    "max": null,
                    "min": null,
                    "name": "days_awarded",
                    "onlyInt": false,
                    "presentable": false,
                    "required": true,
                    "system": false,
                    "type": "number"
                },
                {
                    "hidden": false,
                    "id": "autodate2990389176",
                    "name": "created",
                    "onCreate": true,
                    "onUpdate": false,
                    "presentable": false,
                    "system": false,
                    "type": "autodate"
                },
                {
                    "hidden": false,
                    "id": "autodate3332085495",
                    "name": "updated",
                    "onCreate": true,
                    "onUpdate": true,
                    "presentable": false,
                    "system": false,
                    "type": "autodate"
                }
            ]
        });
        app.save(logs);
    }

    // 3. Add promocode_used relation to users collection
    const users = app.findCollectionByNameOrId("users");
    const hasField = users.fields.getByName("promocode_used");
    if (!hasField) {
        users.fields.add({
            "cascadeDelete": false,
            "collectionId": promoId,
            "hidden": false,
            "id": "relation2847107457",
            "maxSelect": 1,
            "minSelect": 0,
            "name": "promocode_used",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "relation"
        });
        app.save(users);
    }

}, (app) => {
    // Revert users collection
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeById("relation2847107457");
    app.save(users);

    // Drop collections
    try {
        const logs = app.findCollectionByNameOrId("promocode_logs");
        app.delete(logs);
    } catch(err) { /* ignore */ }
    
    try {
        const promocodes = app.findCollectionByNameOrId("promocodes");
        app.delete(promocodes);
    } catch(err) { /* ignore */ }
});
