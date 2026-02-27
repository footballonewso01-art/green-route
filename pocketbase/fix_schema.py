"""
Repair script: reads current PocketBase _collections schema for 'users',
prints it, and strips any corrupted 'role' field so PocketBase works again.
Then re-adds a clean 'role' field.
"""
import sqlite3
import json
import sys

DB_PATH = "pocketbase/pb_data/data.db"

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Step 1: Read current users collection schema
    cursor.execute('SELECT id, schema FROM _collections WHERE name = "users"')
    row = cursor.fetchone()
    if not row:
        print("ERROR: 'users' collection not found in _collections table!")
        sys.exit(1)

    collection_id = row[0]
    try:
        schema = json.loads(row[1])
    except json.JSONDecodeError as e:
        print(f"ERROR: Schema JSON is corrupted: {e}")
        print(f"Raw schema: {row[1][:500]}")
        sys.exit(1)

    print(f"Collection ID: {collection_id}")
    print(f"Current schema has {len(schema)} fields:")
    for f in schema:
        print(f"  - {f.get('name')} (type={f.get('type')}, system={f.get('system')})")

    # Step 2: Remove any existing 'role' field (it might be corrupted)
    clean_schema = [f for f in schema if f.get("name") != "role"]
    removed = len(schema) - len(clean_schema)
    print(f"\nRemoved {removed} 'role' field(s).")

    # Step 3: Add a properly formatted role field
    clean_schema.append({
        "system": False,
        "id": "role_text_fld",
        "name": "role",
        "type": "text",
        "required": False,
        "presentable": False,
        "unique": False,
        "options": {
            "min": None,
            "max": None,
            "pattern": ""
        }
    })
    print("Added clean 'role' text field.")

    # Step 4: Write back
    new_schema_json = json.dumps(clean_schema)
    cursor.execute(
        "UPDATE _collections SET schema = ? WHERE id = ?",
        (new_schema_json, collection_id)
    )
    conn.commit()
    print("\nSchema updated successfully in SQLite.")
    print(">>> You MUST restart PocketBase for changes to take effect! <<<")

    # Step 5: Also ensure the user record has 'role' column in the users table
    try:
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        if "role" not in columns:
            cursor.execute('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"')
            conn.commit()
            print("Added 'role' column to users table.")
        else:
            print("'role' column already exists in users table.")
    except Exception as e:
        print(f"Warning checking users table columns: {e}")

    conn.close()
    print("\nDone! Now restart PocketBase and try saving again.")

if __name__ == "__main__":
    main()
