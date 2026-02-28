import sqlite3
import json

db_path = "pocketbase/pb_data/data.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT schema FROM _collections WHERE name='users'")
row = cursor.fetchone()

if row:
    schema = json.loads(row[0])
    for field in schema:
        print(f"Field: {field['name']}, Type: {field['type']}")
else:
    print("Collection 'users' not found.")

conn.close()
