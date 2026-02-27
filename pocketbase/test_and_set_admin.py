"""
Set user role to 'admin' via PocketBase API.
Tries multiple auth endpoints (v0.22 and v0.23+).
"""
import requests
import json
import sys

PB_URL = "http://127.0.0.1:8090"

ADMIN_CREDS = [
    {"identity": "admin@greenroute.dev", "password": "Password123!"},
    {"identity": "admin@example.com", "password": "admin123456"},
]

AUTH_ENDPOINTS = [
    "/api/admins/auth-with-password",                    # PB <= 0.22
    "/api/collections/_superusers/auth-with-password",   # PB >= 0.23
]

def try_auth():
    for endpoint in AUTH_ENDPOINTS:
        for creds in ADMIN_CREDS:
            url = f"{PB_URL}{endpoint}"
            try:
                r = requests.post(url, json=creds, timeout=5)
                print(f"  {endpoint} with {creds['identity']}: {r.status_code}")
                if r.status_code == 200:
                    return r.json().get("token")
            except Exception as e:
                print(f"  Error: {e}")
    return None

def main():
    # Health check
    try:
        h = requests.get(f"{PB_URL}/api/health", timeout=5)
        print(f"Health: {h.status_code}")
    except:
        print("PocketBase unreachable!")
        sys.exit(1)

    # Try auth
    print("\nTrying auth endpoints...")
    token = try_auth()

    if not token:
        print("\nAll auth attempts failed!")
        print("Falling back to direct SQLite update...")
        direct_sqlite_update()
        return

    headers = {"Authorization": f"Bearer {token}"}

    # List users and set role
    users = requests.get(f"{PB_URL}/api/collections/users/records?perPage=50", headers=headers, timeout=5)
    if users.status_code == 200:
        items = users.json().get("items", [])
        print(f"\nFound {len(items)} user(s):")
        for u in items:
            print(f"  {u['id']} | {u.get('email','?')} | role={u.get('role','N/A')}")

        if items:
            target = items[0]
            print(f"\nSetting {target.get('email')} role to 'admin'...")
            r = requests.patch(
                f"{PB_URL}/api/collections/users/records/{target['id']}",
                headers=headers,
                json={"role": "admin"},
                timeout=5
            )
            print(f"Result: {r.status_code} - {r.text[:300]}")
    else:
        print(f"Users list failed: {users.status_code} {users.text[:200]}")


def direct_sqlite_update():
    """If API auth doesn't work, update role directly in SQLite."""
    import sqlite3
    db_path = "pocketbase/pb_data/data.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get the first user
    cursor.execute('SELECT id, email, role FROM users LIMIT 5')
    rows = cursor.fetchall()
    print(f"\nUsers in SQLite:")
    for row in rows:
        print(f"  {row[0]} | {row[1]} | role={row[2]}")

    if rows:
        user_id = rows[0][0]
        user_email = rows[0][1]
        cursor.execute('UPDATE users SET role = ? WHERE id = ?', ('admin', user_id))
        conn.commit()
        print(f"\nSet role='admin' for {user_email} directly in SQLite.")
        print(">>> Restart PocketBase for changes to take effect! <<<")

    conn.close()


if __name__ == "__main__":
    main()
