import sqlite3
import json

conn = sqlite3.connect('pocketbase/pb_data/data.db')
c = conn.cursor()

c.execute("SELECT schema FROM _collections WHERE name='billing'")
row = c.fetchone()
schema = json.loads(row[0])
print("Full schema:")
for field in schema:
    print(json.dumps(field, indent=2))

# Check users collection ID
c.execute("SELECT id FROM _collections WHERE name='users'")
users_row = c.fetchone()
print("\nUsers collection id:", users_row[0])

# Check all columns in billing table
c.execute("PRAGMA table_info(billing)")
cols = c.fetchall()
print("\nBilling table columns:")
for col in cols:
    print(f"  {col[1]} ({col[2]})")

conn.close()
