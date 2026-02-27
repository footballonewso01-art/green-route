"""Quick test: verify PocketBase is healthy and check the user role after restart."""
import requests
import sqlite3
import json

PB_URL = "http://127.0.0.1:8090"

def main():
    # 1. Health
    try:
        h = requests.get(f"{PB_URL}/api/health", timeout=5)
        print(f"Health: {h.status_code} {h.text}")
    except Exception as e:
        print(f"Not reachable: {e}")
        return

    # 2. Check schema via public endpoint
    try:
        r = requests.get(f"{PB_URL}/api/collections/users/records?perPage=1", timeout=5)
        print(f"\nPublic users endpoint: {r.status_code}")
        if r.status_code == 200:
            items = r.json().get("items", [])
            if items:
                print(f"First user keys: {list(items[0].keys())}")
                print(f"First user role: {items[0].get('role', 'NOT PRESENT')}")
        elif r.status_code == 403:
            print("Auth required (expected - rules are working)")
    except Exception as e:
        print(f"Error: {e}")

    # 3. Verify in SQLite directly
    conn = sqlite3.connect("pocketbase/pb_data/data.db")
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, email, role FROM users LIMIT 5')
    rows = cursor.fetchall()
    print(f"\nDirect SQLite check:")
    for row in rows:
        print(f"  {row[0]} | {row[1]} | role={row[2]}")
    
    # 4. Check if schema is clean
    cursor.execute('SELECT schema FROM _collections WHERE name = "users"')
    schema_row = cursor.fetchone()
    if schema_row:
        schema = json.loads(schema_row[0])
        role_f = next((f for f in schema if f["name"] == "role"), None)
        if role_f:
            print(f"\nRole field in schema: {json.dumps(role_f)}")
        else:
            print("\nWARNING: role field NOT in schema!")
    
    conn.close()

if __name__ == "__main__":
    main()
