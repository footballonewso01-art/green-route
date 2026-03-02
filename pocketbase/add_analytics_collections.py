import requests
import json
import sys

base_url = "http://127.0.0.1:8090"
ADMIN_CREDS = [
    {"identity": "admin@greenroute.dev", "password": "Password123!"},
    {"identity": "admin@example.com", "password": "admin123456"},
    {"identity": "admin@admin.com", "password": "adminadminadmin"}
]

AUTH_ENDPOINTS = [
    "/api/admins/auth-with-password",
    "/api/collections/_superusers/auth-with-password",
]

token = None
for endpoint in AUTH_ENDPOINTS:
    for creds in ADMIN_CREDS:
        try:
            r = requests.post(f"{base_url}{endpoint}", json=creds, timeout=5)
            if r.status_code == 200:
                token = r.json().get("token")
                print(f"Logged in with {creds['identity']} at {endpoint}")
                break
        except Exception:
            pass
    if token:
        break

if not token:
    print("Failed to login with all known credentials.")
    sys.exit(1)

headers = {'Content-Type': 'application/json', 'Authorization': f"Bearer {token}"}

collections = [
    {
        "name": "analytics_events",
        "type": "base",
        "schema": [
            {"name": "event_name", "type": "text", "required": True},
            {"name": "user_id", "type": "relation", "options": {"collectionId": "_pb_users_auth_", "maxSelect": 1}},
            {"name": "metadata", "type": "json"}
        ],
        "listRule": "@request.auth.role = 'admin'",
        "viewRule": "@request.auth.role = 'admin'",
        "createRule": ""
    },
    {
        "name": "system_logs",
        "type": "base",
        "schema": [
            {"name": "level", "type": "text", "required": True},
            {"name": "message", "type": "text"},
            {"name": "latency", "type": "number"},
            {"name": "endpoint", "type": "text"},
            {"name": "context", "type": "json"}
        ],
        "listRule": "@request.auth.role = 'admin'",
        "viewRule": "@request.auth.role = 'admin'",
        "createRule": ""
    }
]

for coll in collections:
    try:
        r = requests.post(f"{base_url}/api/collections", json=coll, headers=headers, timeout=5)
        if r.status_code in [200, 204]:
            print(f"Created collection {coll['name']}")
        else:
            print(f"Error creating {coll['name']} (might exist): {r.status_code} {r.text}")
    except Exception as e:
        print(f"Exception creating {coll['name']}: {e}")
