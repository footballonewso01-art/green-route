import sqlite3
import json
import os

DB_PATH = '/pb/pb_data/data.db'

def repair():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}, skipping repair.")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check column name (fields vs schema)
        cursor.execute("PRAGMA table_info(_collections)")
        columns = [row[1] for row in cursor.fetchall()]
        col_name = 'fields' if 'fields' in columns else 'schema'
        
        cursor.execute(f"SELECT id, {col_name} FROM _collections WHERE name='links'")
        row = cursor.fetchone()
        if row:
            coll_id = row[0]
            fields = json.loads(row[1])
            initial_count = len(fields)
            
            # IDs to remove: icon_type_fixed, icon_value_fixed, icon_color_fixed
            new_fields = [f for f in fields if f.get('id') not in ['icon_type_fixed', 'icon_value_fixed', 'icon_color_fixed']]
            
            if len(new_fields) < initial_count:
                print(f"Found {initial_count - len(new_fields)} duplicate fields. Cleaning up...")
                cursor.execute(f"UPDATE _collections SET {col_name} = ? WHERE id = ?", (json.dumps(new_fields), coll_id))
                conn.commit()
                print("Repair successful.")
            else:
                print("No duplicate fields found in 'links' collection.")
        else:
            print("Collection 'links' not found.")
            
        # Check for missing fields 'domain' and 'created_ip'
        # Add domain to links
        cursor.execute("SELECT id, fields FROM _collections WHERE name='links'")
        links_row = cursor.fetchone()
        if links_row:
            links_id = links_row[0]
            links_fields = json.loads(links_row[1])
            if not any(f.get('name') == 'domain' for f in links_fields):
                print("Adding 'domain' field to 'links' schema...")
                links_fields.append({
                    "autogeneratePattern": "",
                    "hidden": False,
                    "id": "domain_id_gen",
                    "max": 0,
                    "min": 0,
                    "name": "domain",
                    "pattern": "",
                    "presentable": False,
                    "primaryKey": False,
                    "required": False,
                    "system": False,
                    "type": "text"
                })
                cursor.execute("UPDATE _collections SET fields = ? WHERE id = ?", (json.dumps(links_fields, separators=(',', ':')), links_id))
                try:
                    cursor.execute("ALTER TABLE links ADD COLUMN domain TEXT DEFAULT '' NOT NULL")
                    print("Added column 'domain' to SQLite table 'links'.")
                except Exception as e:
                    print(f"Column domain likely exists: {e}")
                conn.commit()
                
        # Add created_ip to users
        cursor.execute("SELECT id, fields FROM _collections WHERE name='users'")
        users_row = cursor.fetchone()
        if users_row:
            users_id = users_row[0]
            users_fields = json.loads(users_row[1])
            if not any(f.get('name') == 'created_ip' for f in users_fields):
                print("Adding 'created_ip' field to 'users' schema...")
                users_fields.append({
                    "autogeneratePattern": "",
                    "hidden": False,
                    "id": "created_ip_gen",
                    "max": 0,
                    "min": 0,
                    "name": "created_ip",
                    "pattern": "",
                    "presentable": False,
                    "primaryKey": False,
                    "required": False,
                    "system": False,
                    "type": "text"
                })
                cursor.execute("UPDATE _collections SET fields = ? WHERE id = ?", (json.dumps(users_fields, separators=(',', ':')), users_id))
                try:
                    cursor.execute("ALTER TABLE users ADD COLUMN created_ip TEXT DEFAULT '' NOT NULL")
                    print("Added column 'created_ip' to SQLite table 'users'.")
                except Exception as e:
                    print(f"Column created_ip likely exists: {e}")
                conn.commit()

        # --- HIGHLOAD REFACTOR: Replace analytics_daily view with physical Rollup Table ---
        cursor.execute("SELECT name, type FROM sqlite_master WHERE name='analytics_daily'")
        col_type = cursor.fetchone()
        
        if col_type and col_type[1] == 'view':
            print("Found old analytics_daily VIEW. Dropping it to migrate to physical Rollup Table...")
            cursor.execute("DROP VIEW analytics_daily")
            # Delete the old _collections record for the view
            cursor.execute("DELETE FROM _collections WHERE name='analytics_daily'")
            # Delete any migration records relating to it
            cursor.execute("DELETE FROM _migrations WHERE file LIKE '%analytics_view%'")
            conn.commit()
            col_type = None # Proceed to create physical table
            
        # Only create analytics_daily if it doesn't already exist as a table
        # (Previously, this was force-dropped on every restart, corrupting PB's collection registry)

        cursor.execute("SELECT id FROM _collections WHERE name='analytics_daily'")
        coll_exists = cursor.fetchone()

        if not coll_exists:
            print("Creating analytics_daily physical Rollup Table...")
            cursor.execute("SELECT id FROM _collections WHERE name='links'")
            links_id_row = cursor.fetchone()
            links_id = links_id_row[0] if links_id_row else "links0000000000"
            
            fields_json = [
                {
                    "system": False,
                    "hidden": False,
                    "primaryKey": False,
                    "id": "f_link_id",
                    "name": "link_id",
                    "type": "relation",
                    "required": True,
                    "presentable": False,
                    "collectionId": links_id,
                    "cascadeDelete": True,
                    "minSelect": 0,
                    "maxSelect": 1
                },
                {
                    "system": False,
                    "hidden": False,
                    "primaryKey": False,
                    "id": "f_day_000",
                    "name": "day",
                    "type": "date",
                    "required": True,
                    "presentable": False,
                    "min": "",
                    "max": ""
                },
                {
                    "system": False,
                    "hidden": False,
                    "primaryKey": False,
                    "id": "f_count_0",
                    "name": "count",
                    "type": "number",
                    "required": True,
                    "presentable": False,
                    "min": 0,
                    "max": None,
                    "onlyInt": True
                }
            ]
            
            # 1. Register in _collections
            cursor.execute("""
                INSERT INTO _collections (id, system, type, name, listRule, viewRule, createRule, updateRule, deleteRule, fields, indexes, created, updated)
                VALUES (
                    'analyticsdaily0', 0, 'base', 'analytics_daily', 
                    '@request.auth.id != "" && link_id.user_id = @request.auth.id', 
                    '@request.auth.id != "" && link_id.user_id = @request.auth.id',
                    null, null, null,
                    ?,
                    '["CREATE UNIQUE INDEX idx_analytics_daily_link_day ON analytics_daily (link_id, day)"]',
                    datetime('now'), datetime('now')
                )
            """, (json.dumps(fields_json, separators=(',', ':')),))
            
            # 2. Create the physical SQLite table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS analytics_daily (
                    id TEXT PRIMARY KEY,
                    link_id TEXT NOT NULL,
                    day TEXT NOT NULL,
                    count REAL NOT NULL DEFAULT 0,
                    created TEXT NOT NULL,
                    updated TEXT NOT NULL,
                    FOREIGN KEY(link_id) REFERENCES links(id) ON DELETE CASCADE
                )
            """)
            
            # 3. Create unique index for UPSERT
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_daily_link_day ON analytics_daily (link_id, day)")
            
            # 4. Backfill historical data from clicks table (Zero downtime migration)
            print("Backfilling historical analytics data from clicks...")
            cursor.execute("""
                INSERT INTO analytics_daily (id, link_id, day, count, created, updated)
                SELECT 
                    lower(hex(randomblob(7))) || 'a' as id, 
                    link_id, 
                    date(created) || ' 00:00:00.000Z' as day, 
                    count(id) as count,
                    datetime('now'),
                    datetime('now')
                FROM clicks 
                GROUP BY link_id, date(created)
                ON CONFLICT(link_id, day) DO UPDATE SET count = count + excluded.count
            """)
            conn.commit()
            print("Successfully migrated analytics_daily to a physical table.")
        else:
            print("analytics_daily table exists and is healthy.")

        # --- BUG-11 FIX: Skip clicks_count drift check on container startup to prevent hang ---
        print("Skipping clicks_count drift check to prevent startup timeout.")

        conn.close()
    except Exception as e:
        print(f"Error during repair: {e}")

if __name__ == "__main__":
    repair()
