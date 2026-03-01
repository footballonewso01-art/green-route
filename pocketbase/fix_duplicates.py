import sqlite3
import json
import os

DB_PATH = "pocketbase/pb_data/data.db"

def fix_links_collection():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Get the links collection
        cursor.execute("SELECT id, schema FROM _collections WHERE name='links'")
        row = cursor.fetchone()
        if not row:
            print("Links collection not found.")
            return

        cid, schema_json = row
        schema = json.loads(schema_json)
        
        seen_names = set()
        new_schema = []
        removed_count = 0

        for field in schema:
            name = field.get('name')
            if name in ['icon_type', 'icon_value', 'icon_color']:
                if name in seen_names:
                    print(f"Removing duplicate field: {name} (id: {field.get('id')})")
                    removed_count += 1
                    continue
                seen_names.add(name)
            new_schema.append(field)

        if removed_count > 0:
            new_schema_json = json.dumps(new_schema)
            cursor.execute("UPDATE _collections SET schema=? WHERE id=?", (new_schema_json, cid))
            conn.commit()
            print(f"Successfully removed {removed_count} duplicate fields.")
        else:
            print("No duplicates found in schema metadata.")

    except Exception as e:
        print(f"Error during repair: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_links_collection()
