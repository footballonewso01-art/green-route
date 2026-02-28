import sqlite3
import json

db_path = "pocketbase/pb_data/data.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, schema FROM _collections WHERE name='users'")
row = cursor.fetchone()

if row:
    coll_id, schema_json = row
    schema = json.loads(schema_json)
    existing_fields = {f['name'] for f in schema}
    
    if 'internal_notes' not in existing_fields:
        field_def = {
            "system": False,
            "id": "fld_inotes",
            "name": "internal_notes",
            "type": "text",
            "required": False,
            "presentable": False,
            "unique": False,
            "options": {"min": None, "max": None, "pattern": ""}
        }
        schema.append(field_def)
        
        cursor.execute("UPDATE _collections SET schema = ? WHERE id = ?", (json.dumps(schema), coll_id))
        
        cursor.execute("PRAGMA table_info(users)")
        columns = {col[1] for col in cursor.fetchall()}
        
        if 'internal_notes' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN internal_notes TEXT DEFAULT ''")
            
        conn.commit()
        print("Schema repaired. Added 'internal_notes' field to users. Restart PocketBase.")
    else:
        print("Field 'internal_notes' already exists in schema.")
else:
    print("Collection 'users' not found.")

conn.close()
