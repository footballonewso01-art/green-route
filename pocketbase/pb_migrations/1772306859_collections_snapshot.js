/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const snapshot = [
    {
      "id": "_pb_users_auth_",
      "created": "2026-02-25 17:49:56.233Z",
      "updated": "2026-02-26 19:01:45.223Z",
      "name": "users",
      "type": "auth",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "users_name",
          "name": "name",
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
          "id": "users_avatar",
          "name": "avatar",
          "type": "file",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "mimeTypes": [
              "image/jpeg",
              "image/png",
              "image/svg+xml",
              "image/gif",
              "image/webp"
            ],
            "thumbs": null,
            "maxSelect": 1,
            "maxSize": 5242880,
            "protected": false
          }
        },
        {
          "system": false,
          "id": "v3n6jccv",
          "name": "bio",
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
          "id": "pf1dvsrw",
          "name": "theme",
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
          "id": "plan_type_id",
          "name": "plan",
          "type": "select",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSelect": 1,
            "values": [
              "creator",
              "pro",
              "agency"
            ]
          }
        },
        {
          "system": false,
          "id": "plan_status_id",
          "name": "plan_status",
          "type": "select",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSelect": 1,
            "values": [
              "active",
              "trial",
              "expired",
              "cancelled"
            ]
          }
        },
        {
          "system": false,
          "id": "plan_expires_at_id",
          "name": "plan_expires_at",
          "type": "date",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": "",
            "max": ""
          }
        },
        {
          "system": false,
          "id": "stripe_customer_id",
          "name": "stripe_customer_id",
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
          "id": "stripe_sub_id",
          "name": "stripe_subscription_id",
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
          "id": "custom_theme_bg_id",
          "name": "custom_theme_bg",
          "type": "file",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "mimeTypes": [
              "image/jpeg",
              "image/png",
              "image/svg+xml",
              "image/gif",
              "image/webp"
            ],
            "thumbs": [
              "100x100"
            ],
            "maxSelect": 1,
            "maxSize": 5242880,
            "protected": false
          }
        },
        {
          "system": false,
          "id": "social_links_json",
          "name": "social_links",
          "type": "json",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 2000000
          }
        },
        {
          "system": false,
          "id": "username_last_changed",
          "name": "username_last_changed",
          "type": "date",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": "",
            "max": ""
          }
        },
        {
          "system": false,
          "id": "role_text_fld",
          "name": "role",
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
          "id": "fld_banned",
          "name": "banned",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "fld_inotes",
          "name": "internal_notes",
          "type": "text",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        }
      ],
      "indexes": [],
      "listRule": "@request.auth.role = \"admin\" || id = @request.auth.id",
      "viewRule": "@request.auth.role = \"admin\" || id = @request.auth.id",
      "createRule": "",
      "updateRule": "@request.auth.role = \"admin\" || id = @request.auth.id",
      "deleteRule": "@request.auth.role = \"admin\" || id = @request.auth.id",
      "options": {
        "allowEmailAuth": true,
        "allowOAuth2Auth": true,
        "allowUsernameAuth": true,
        "exceptEmailDomains": null,
        "manageRule": null,
        "minPasswordLength": 8,
        "onlyEmailDomains": null,
        "onlyVerified": false,
        "requireEmail": false
      }
    },
    {
      "id": "7htjjwv9ii7y93r",
      "created": "2026-02-25 17:55:08.301Z",
      "updated": "2026-02-26 22:14:06.459Z",
      "name": "links",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "xb2g5voa",
          "name": "slug",
          "type": "text",
          "required": true,
          "presentable": false,
          "unique": true,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        },
        {
          "system": false,
          "id": "ds3avvff",
          "name": "destination_url",
          "type": "text",
          "required": true,
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
          "id": "kdckdzcb",
          "name": "user_id",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "_pb_users_auth_",
            "cascadeDelete": true,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        },
        {
          "system": false,
          "id": "bwephtlb",
          "name": "active",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "jbcud15t",
          "name": "clicks_count",
          "type": "number",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "noDecimal": false
          }
        },
        {
          "system": false,
          "id": "whv4b8p9",
          "name": "interstitial_enabled",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "3p6gi8fi",
          "name": "title",
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
          "id": "gtpxzlre",
          "name": "order",
          "type": "date",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": "",
            "max": ""
          }
        },
        {
          "system": false,
          "id": "g2qftr1v",
          "name": "show_on_profile",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "rxjpe2vz",
          "name": "mode",
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
          "id": "1v3y8zxc",
          "name": "icon_type",
          "type": "select",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSelect": 1,
            "values": [
              "preset",
              "emoji",
              "custom",
              "none"
            ]
          }
        },
        {
          "system": false,
          "id": "gkr1md5p",
          "name": "icon_value",
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
          "id": "yhn2kx4q",
          "name": "icon_color",
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
          "id": "icon_type_fixed",
          "name": "icon_type",
          "type": "select",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSelect": 1,
            "values": [
              "preset",
              "emoji",
              "custom",
              "none"
            ]
          }
        },
        {
          "system": false,
          "id": "icon_value_fixed",
          "name": "icon_value",
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
          "id": "icon_color_fixed",
          "name": "icon_color",
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
          "id": "fld_cloaki",
          "name": "cloaking",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "fld_utm_so",
          "name": "utm_source",
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
          "id": "fld_utm_me",
          "name": "utm_medium",
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
          "id": "fld_utm_ca",
          "name": "utm_campaign",
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
          "id": "fld_geo_ta",
          "name": "geo_targeting",
          "type": "json",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 0
          }
        },
        {
          "system": false,
          "id": "fld_device",
          "name": "device_targeting",
          "type": "json",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 0
          }
        },
        {
          "system": false,
          "id": "fld_ab_spl",
          "name": "ab_split",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "fld_split_",
          "name": "split_urls",
          "type": "json",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "maxSize": 0
          }
        },
        {
          "system": false,
          "id": "fld_start_",
          "name": "start_at",
          "type": "date",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": "",
            "max": ""
          }
        },
        {
          "system": false,
          "id": "fld_expire",
          "name": "expire_at",
          "type": "date",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": "",
            "max": ""
          }
        },
        {
          "system": false,
          "id": "fld_safe_p",
          "name": "safe_page_url",
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
          "id": "fld_fb_pix",
          "name": "fb_pixel",
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
          "id": "fld_google",
          "name": "google_pixel",
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
          "id": "fld_tiktok",
          "name": "tiktok_pixel",
          "type": "text",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        }
      ],
      "indexes": [],
      "listRule": "@request.auth.role = \"admin\" || user_id = @request.auth.id",
      "viewRule": "@request.auth.role = \"admin\" || user_id = @request.auth.id",
      "createRule": "@request.auth.id != \"\" && @request.auth.id = user_id",
      "updateRule": "@request.auth.role = \"admin\" || user_id = @request.auth.id",
      "deleteRule": "@request.auth.role = \"admin\" || user_id = @request.auth.id",
      "options": {}
    },
    {
      "id": "vx9gk68kkwd9g5z",
      "created": "2026-02-25 17:55:35.384Z",
      "updated": "2026-02-26 16:13:46.292Z",
      "name": "clicks",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "bsakear6",
          "name": "link_id",
          "type": "relation",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "7htjjwv9ii7y93r",
            "cascadeDelete": true,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": null
          }
        },
        {
          "system": false,
          "id": "53r9szyu",
          "name": "country",
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
          "id": "ff7fvkgt",
          "name": "device",
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
          "id": "b5ziphrk",
          "name": "os",
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
          "id": "xb3x2eoi",
          "name": "browser",
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
          "id": "o5mbzxsd",
          "name": "referrer",
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
          "id": "btaa9hlq",
          "name": "is_unique",
          "type": "bool",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {}
        },
        {
          "system": false,
          "id": "fld_ip",
          "name": "ip",
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
          "id": "fld_user_a",
          "name": "user_agent",
          "type": "text",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        }
      ],
      "indexes": [],
      "listRule": "@request.auth.role = \"admin\" || link_id.user_id = @request.auth.id",
      "viewRule": "@request.auth.role = \"admin\" || link_id.user_id = @request.auth.id",
      "createRule": "",
      "updateRule": "@request.auth.role = \"admin\" || link_id.user_id = @request.auth.id",
      "deleteRule": "@request.auth.role = \"admin\" || link_id.user_id = @request.auth.id",
      "options": {}
    },
    {
      "id": "wobillingcollect",
      "created": "2026-02-26 23:12:18.000Z",
      "updated": "2026-02-26 23:12:18.000Z",
      "name": "billing",
      "type": "base",
      "system": false,
      "schema": [
        {
          "system": false,
          "id": "v6xq9zla",
          "name": "user_id",
          "type": "relation",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "collectionId": "users",
            "cascadeDelete": true,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": []
          }
        },
        {
          "system": false,
          "id": "p2lw8ab1",
          "name": "plan",
          "type": "text",
          "required": true,
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
          "id": "m3x9b2q5",
          "name": "amount",
          "type": "number",
          "required": true,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "noDecimal": false
          }
        },
        {
          "system": false,
          "id": "k8v2n1m4",
          "name": "status",
          "type": "text",
          "required": true,
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
          "id": "l7b6v5c4",
          "name": "payment_method",
          "type": "text",
          "required": false,
          "presentable": false,
          "unique": false,
          "options": {
            "min": null,
            "max": null,
            "pattern": ""
          }
        }
      ],
      "indexes": [],
      "listRule": "@request.auth.role = 'admin' || user_id = @request.auth.id",
      "viewRule": "@request.auth.role = 'admin' || user_id = @request.auth.id",
      "createRule": "@request.auth.id != \"\"",
      "updateRule": "@request.auth.role = 'admin'",
      "deleteRule": "@request.auth.role = 'admin'",
      "options": {}
    }
  ];

  const collections = snapshot.map((item) => new Collection(item));

  return Dao(db).importCollections(collections, true, null);
}, (db) => {
  return null;
})
