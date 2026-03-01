import sqlite3
import os

DB_PATH = "pocketbase/pb_data/data.db"

def fix_data():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Update user_id for orphan links (the user who reported the issue)
        cursor.execute("UPDATE links SET user_id = '6mcohitvfylwwmw' WHERE user_id = '60g7h1nyp5otgsh'")
        
        conn.commit()
        print("Orphan links successfully reconnected to the valid user.")

    except Exception as e:
        print(f"Error during fixing: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_data()
