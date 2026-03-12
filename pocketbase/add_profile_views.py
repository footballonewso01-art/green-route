import sqlite3
import json

db_path = "pocketbase/pb_data/data.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Get users collection schema
cur.execute("SELECT schema FROM _collections WHERE name='users'")
row = cur.fetchone()
if row:
    schema = json.loads(row[0])
    # check if profile_views exists
    exists = any(f.get("name") == "profile_views" for f in schema)
    if not exists:
        schema.append({
            "system": False,
            "id": "profileviews1",
            "name": "profile_views",
            "type": "number",
            "required": False,
            "presentable": False,
            "unique": False,
            "options": {
                "min": 0,
                "max": None,
                "noDecimal": True
            }
        })
        cur.execute("UPDATE _collections SET schema = ? WHERE name='users'", (json.dumps(schema),))
        conn.commit()
        print("Success: added profile_views to users collection.")
    else:
        print("profile_views already exists.")
else:
    print("Could not find users collection.")

conn.close()
