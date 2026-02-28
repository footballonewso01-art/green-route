import sqlite3
import json

db_path = "pocketbase/pb_data/data.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name, schema FROM _collections WHERE name='clicks'")
row = cursor.fetchone()

if row:
    schema = json.loads(row[1])
    fields = [f['name'] for f in schema]
    print(f"Clicks fields: {fields}")
else:
    print("Collection 'clicks' not found.")

conn.close()
