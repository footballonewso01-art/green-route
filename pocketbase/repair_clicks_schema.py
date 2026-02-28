import sqlite3
import json

db_path = "pocketbase/pb_data/data.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, schema FROM _collections WHERE name='clicks'")
row = cursor.fetchone()

if row:
    coll_id, schema_json = row
    schema = json.loads(schema_json)
    existing_fields = {f['name'] for f in schema}
    
    new_fields = [
        {"name": "ip", "type": "text"},
        {"name": "user_agent", "type": "text"}
    ]
    
    added_to_schema = False
    for nf in new_fields:
        if nf['name'] not in existing_fields:
            field_def = {
                "system": False,
                "id": f"fld_{nf['name'][:6]}",
                "name": nf['name'],
                "type": nf['type'],
                "required": False,
                "presentable": False,
                "unique": False,
                "options": {"min": None, "max": None, "pattern": ""}
            }
            schema.append(field_def)
            print(f"Adding '{nf['name']}' to clicks schema.")
            added_to_schema = True
            
    if added_to_schema:
        cursor.execute("UPDATE _collections SET schema = ? WHERE id = ?", (json.dumps(schema), coll_id))
        
        cursor.execute("PRAGMA table_info(clicks)")
        columns = {col[1] for col in cursor.fetchall()}
        
        for nf in new_fields:
            if nf['name'] not in columns:
                cursor.execute(f"ALTER TABLE clicks ADD COLUMN {nf['name']} TEXT")
                print(f"Added column '{nf['name']}' to 'clicks' physical table.")
                
        conn.commit()
        print("Schema repaired. Restart PocketBase.")
    else:
        print("Fields already exist in schema.")
else:
    print("Collection 'clicks' not found.")

conn.close()
