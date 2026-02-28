import sqlite3
import json
import os

DB_PATH = "d:/route-smartly-now-main/pocketbase/pb_data/data.db"
if not os.path.exists(DB_PATH):
    DB_PATH = "pocketbase/pb_data/data.db"

def repair_links_schema():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Get current schema
    cursor.execute("SELECT id, schema FROM _collections WHERE name='links'")
    row = cursor.fetchone()
    if not row:
        print("Links collection not found!")
        return
    
    coll_id, schema_json = row
    schema = json.loads(schema_json)
    existing_fields = {f['name'] for f in schema}

    # 2. Define missing fields
    new_fields = [
        {"name": "cloaking", "type": "bool"},
        {"name": "utm_source", "type": "text"},
        {"name": "utm_medium", "type": "text"},
        {"name": "utm_campaign", "type": "text"},
        {"name": "geo_targeting", "type": "json"},
        {"name": "device_targeting", "type": "json"},
        {"name": "ab_split", "type": "bool"},
        {"name": "split_urls", "type": "json"},
        {"name": "start_at", "type": "date"},
        {"name": "expire_at", "type": "date"},
        {"name": "safe_page_url", "type": "text"},
        {"name": "fb_pixel", "type": "text"},
        {"name": "google_pixel", "type": "text"},
        {"name": "tiktok_pixel", "type": "text"},
        {"name": "interstitial_enabled", "type": "bool"}, # Just in case it was missing or corrupted
        {"name": "size", "type": "text"},
    ]

    added_to_schema = False
    for nf in new_fields:
        if nf['name'] not in existing_fields:
            # Generate a semi-random ID for the field if it doesn't exist
            field_id = f"fld_{nf['name'][:6]}"
            field_def = {
                "system": False,
                "id": field_id,
                "name": nf['name'],
                "type": nf['type'],
                "required": False,
                "presentable": False,
                "unique": False,
                "options": {}
            }
            if nf['type'] == "text":
                field_def["options"] = {"min": None, "max": None, "pattern": ""}
            elif nf['type'] == "number":
                field_def["options"] = {"min": None, "max": None, "noDecimal": False}
            elif nf['type'] == "date":
                field_def["options"] = {"min": "", "max": ""}
            
            schema.append(field_def)
            print(f"Adding field '{nf['name']}' to schema")
            added_to_schema = True

    # 3. Update _collections if schema changed
    if added_to_schema:
        cursor.execute("UPDATE _collections SET schema = ? WHERE id = ?", (json.dumps(schema), coll_id))
        conn.commit()
    
    # 4. Ensure physical columns exist in 'links' table
    cursor.execute("PRAGMA table_info(links)")
    columns = {col[1] for col in cursor.fetchall()}
    
    for nf in new_fields:
        if nf['name'] not in columns:
            col_type = "TEXT"
            if nf['type'] == "bool": col_type = "BOOLEAN DEFAULT FALSE"
            elif nf['type'] == "number": col_type = "REAL"
            elif nf['type'] == "json": col_type = "JSON"
            
            try:
                cursor.execute(f"ALTER TABLE links ADD COLUMN {nf['name']} {col_type}")
                print(f"Added column '{nf['name']}' to 'links' table")
            except Exception as e:
                print(f"Error adding column '{nf['name']}': {e}")
    
    conn.commit()
    conn.close()
    print("Repair complete! Restart PocketBase.")

if __name__ == "__main__":
    repair_links_schema()
