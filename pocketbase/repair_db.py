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
            
        # --- BUG-11 FIX: Conditional sync — only fix drifted records, report drift ---
        print("Checking clicks_count drift...")
        cursor.execute("""
            SELECT l.id, l.clicks_count, COUNT(c.id) as actual_count
            FROM links l
            LEFT JOIN clicks c ON c.link_id = l.id
            GROUP BY l.id
            HAVING l.clicks_count != COUNT(c.id)
        """)
        drifted = cursor.fetchall()
        
        if drifted:
            print(f"WARNING: Found {len(drifted)} links with drifted clicks_count:")
            for row in drifted[:10]:  # Show first 10
                print(f"  Link {row[0]}: stored={row[1]}, actual={row[2]}, drift={row[1] - row[2]}")
            
            cursor.execute("""
                UPDATE links
                SET clicks_count = (
                    SELECT COUNT(*)
                    FROM clicks
                    WHERE clicks.link_id = links.id
                )
                WHERE id IN (
                    SELECT l.id FROM links l
                    LEFT JOIN clicks c ON c.link_id = l.id
                    GROUP BY l.id
                    HAVING l.clicks_count != COUNT(c.id)
                )
            """)
            conn.commit()
            print(f"Fixed {len(drifted)} drifted records.")
        else:
            print("All clicks_count values are in sync. No repair needed.")

        conn.close()
    except Exception as e:
        print(f"Error during repair: {e}")

if __name__ == "__main__":
    repair()
