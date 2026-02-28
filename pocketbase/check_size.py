import sqlite3
import json

db = "d:/route-smartly-now-main/pocketbase/pb_data/data.db"
conn = sqlite3.connect(db)
c = conn.cursor()
c.execute("SELECT schema FROM _collections WHERE name='links'")
row = c.fetchone()
schema = json.loads(row[0])
names = [f["name"] for f in schema]
print("Has size field in schema:", "size" in names)

c.execute("PRAGMA table_info(links)")
cols = [r[1] for r in c.fetchall()]
print("Has size column in table:", "size" in cols)
conn.close()
