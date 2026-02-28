import sqlite3
import os

db_path = "pocketbase/pb_data/data.db"
if not os.path.exists(db_path):
    # Try alternate path
    db_path = "d:/route-smartly-now-main/pocketbase/pb_data/data.db"

if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get the links collection from the _collections table
cursor.execute("SELECT name, schema FROM _collections WHERE name='links'")
row = cursor.fetchone()

if row:
    import json
    print(f"Collection: {row[0]}")
    schema = json.loads(row[1])
    for field in schema:
        print(f" - {field['name']} ({field['type']})")
else:
    print("Collection 'links' not found in _collections table.")

conn.close()
