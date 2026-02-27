import sqlite3
import json

db_path = 'pocketbase/pb_data/data.db'

print('Starting migration...')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get users collection schema
cursor.execute("SELECT id, schema FROM _collections WHERE name = 'users'")
row = cursor.fetchone()

if row:
    collection_id = row[0]
    schema = json.loads(row[1])
    
    has_role = any(f.get('name') == 'role' for f in schema)
    
    if not has_role:
        schema.append({
            'system': False,
            'id': 'users_role_field',
            'name': 'role',
            'type': 'text',
            'required': False,
            'presentable': False,
            'unique': False,
            'options': { 'min': None, 'max': None, 'pattern': '' }
        })
        
        cursor.execute("UPDATE _collections SET schema = ? WHERE id = ?", (json.dumps(schema), collection_id))
        conn.commit()
        print('Added role field to users collection schema.')
    else:
        print('Role field already exists in schema.')

# Try to update users in the table (might fail if we haven't restarted PB to sync schema)
try:
    cursor.execute("UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''")
    conn.commit()
    print(f"Updated {cursor.rowcount} users to have 'user' role.")
except Exception as e:
    print(f"Notice: Could not set default roles (table might need PB restart to create column): {e}")

# Also let's find the main admin user and make them an admin if they exist
try:
    cursor.execute("UPDATE users SET role = 'admin' WHERE email = 'admin@example.com'")
    conn.commit()
    if cursor.rowcount > 0:
        print(f"Set admin@example.com to 'admin' role.")
except Exception as e:
    pass

conn.close()
print('Migration complete.')
