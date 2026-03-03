import sqlite3
import json
import os

DB_PATH = "d:/route-smartly-now-main/pocketbase/pb_data/data.db"

def fix_json_fields():
    print(f"Connecting to database at {DB_PATH}...")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Get links collection schema
        cursor.execute("SELECT id, schema FROM _collections WHERE name='links'")
        row = cursor.fetchone()
        if not row:
            print("Links collection not found!")
            return
        
        coll_id, schema_json = row
        schema = json.loads(schema_json)
        changed = False

        json_fields_to_fix = ["device_targeting", "geo_targeting", "split_urls"]

        for field in schema:
            if field.get("name") in json_fields_to_fix and field.get("type") == "json":
                # Check options
                options = field.get("options", {})
                if "maxSize" not in options or options["maxSize"] == 0:
                    print(f"Fixing maxSize for {field['name']}...")
                    options["maxSize"] = 2000000 # 2MB limit
                    field["options"] = options
                    changed = True

        if changed:
            print("Updating schema in _collections...")
            cursor.execute("UPDATE _collections SET schema = ? WHERE id = ?", (json.dumps(schema), coll_id))
            conn.commit()
            print("Successfully updated database. Restarting pocketbase is required.")
        else:
            print("No fields required fixing.")

        conn.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_json_fields()
