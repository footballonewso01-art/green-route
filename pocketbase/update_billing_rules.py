import sqlite3
import json

db_path = 'pocketbase/pb_data/data.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

# Update createRule for billing collection
# allow creation by any authenticated user
create_rule = '@request.auth.id != ""'

c.execute("UPDATE _collections SET createRule = ? WHERE name = 'billing'", (create_rule,))
conn.commit()

c.execute("SELECT createRule FROM _collections WHERE name = 'billing'")
row = c.fetchone()
print(f"New billing createRule: {row[0]}")

conn.close()
