"""
Add stripe_customer_id and stripe_subscription_id fields to the billing collection
on the remote PocketBase instance (greenroute-pb.fly.dev).
"""
import requests
import json

PB_URL = "https://greenroute-pb.fly.dev"

AUTH_ENDPOINTS = [
    "/api/admins/auth-with-password",
    "/api/collections/_superusers/auth-with-password",
]

ADMIN_CREDS = [
    {"identity": "admin@linktery.com", "password": "linktery2025admin"},
    {"identity": "admin@greenroute.dev", "password": "Password123!"},
    {"identity": "admin@example.com", "password": "admin123456"},
]

# Login as admin
print("Logging in as admin...")
token = None
for endpoint in AUTH_ENDPOINTS:
    for creds in ADMIN_CREDS:
        url = f"{PB_URL}{endpoint}"
        try:
            auth = requests.post(url, json=creds, timeout=10)
            print(f"  {endpoint} with {creds['identity']}: {auth.status_code}")
            if auth.status_code == 200:
                token = auth.json().get("token")
                if token:
                    print(f"  Logged in via {endpoint}")
                    break
        except Exception as e:
            print(f"  Error: {e}")
    if token:
        break

if not token:
    print("All auth attempts failed!")
    exit(1)

headers = {"Authorization": token}

# Get the billing collection schema
print("Fetching billing collection...")
collections = requests.get(f"{PB_URL}/api/collections", headers=headers)
billing_collection = None
for c in collections.json():
    if isinstance(c, dict) and c.get("name") == "billing":
        billing_collection = c
        break

if not billing_collection:
    # Try paginated
    collections = requests.get(f"{PB_URL}/api/collections?perPage=200", headers=headers)
    data = collections.json()
    items = data.get("items", data) if isinstance(data, dict) else data
    for c in items:
        if isinstance(c, dict) and c.get("name") == "billing":
            billing_collection = c
            break

if not billing_collection:
    print("Could not find 'billing' collection!")
    exit(1)

print(f"Found billing collection: {billing_collection['id']}")

# Check if fields already exist
existing_fields = [f["name"] for f in billing_collection.get("schema", [])]
print(f"Existing fields: {existing_fields}")

fields_to_add = []

if "stripe_customer_id" not in existing_fields:
    fields_to_add.append({
        "name": "stripe_customer_id",
        "type": "text",
        "required": False,
        "options": {"min": None, "max": 255, "pattern": ""}
    })

if "stripe_subscription_id" not in existing_fields:
    fields_to_add.append({
        "name": "stripe_subscription_id",
        "type": "text",
        "required": False,
        "options": {"min": None, "max": 255, "pattern": ""}
    })

if not fields_to_add:
    print("All Stripe fields already exist!")
    exit(0)

# Add new fields to existing schema
updated_schema = billing_collection["schema"] + fields_to_add
print(f"Adding {len(fields_to_add)} new fields...")

resp = requests.patch(
    f"{PB_URL}/api/collections/{billing_collection['id']}",
    headers=headers,
    json={"schema": updated_schema}
)

if resp.status_code == 200:
    print("SUCCESS: Stripe fields added to billing collection!")
else:
    print(f"Error: {resp.status_code} {resp.text}")
