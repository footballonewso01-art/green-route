import sqlite3
import json

db_path = 'pocketbase/pb_data/data.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check column name (fields vs schema)
cursor.execute("PRAGMA table_info(_collections)")
columns = [row[1] for row in cursor.fetchall()]
col_name = 'fields' if 'fields' in columns else 'schema'

# Get the schema/fields
cursor.execute(f"SELECT id, {col_name} FROM _collections WHERE name='billing'")
row = cursor.fetchone()
if row:
    coll_id = row[0]
    schema = json.loads(row[1])
    updated = False
    for field in schema:
        if field.get('name') == 'user_id' and field.get('options', {}).get('collectionId') == 'users':
            field['options']['collectionId'] = '_pb_users_auth_'
            print("Updating collectionId to _pb_users_auth_ for billing.user_id")
            updated = True
    
    if updated:
        new_schema = json.dumps(schema)
        cursor.execute(f"UPDATE _collections SET {col_name}=? WHERE id=?", (new_schema, coll_id))
        conn.commit()
        print("Update complete")
    else:
        print("No updates needed")
else:
    print("Billing collection not found")

conn.close()
