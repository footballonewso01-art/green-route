import sqlite3
import os

DB_PATH = "pocketbase/pb_data/data.db"

def sanitize_data():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check 'order' field. If it's a number field now, empty strings might break things.
        # Set empty strings to NULL or 0
        cursor.execute("UPDATE links SET [order] = 0 WHERE [order] = '' OR [order] IS NULL")
        
        # Check icon_type - it should be one of the select values
        # We'll just ensure it's not NULL
        cursor.execute("UPDATE links SET icon_type = 'none' WHERE icon_type = '' OR icon_type IS NULL")
        
        # Check active field
        cursor.execute("UPDATE links SET active = 1 WHERE active IS NULL")

        conn.commit()
        print("Data sanitization for 'links' table completed.")

    except Exception as e:
        print(f"Error during sanitization: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    sanitize_data()
