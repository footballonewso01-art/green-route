import sqlite3
import json
import os

DB_PATH = 'pb_data/data.db'

def update_security_rules():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Update 'links' collection rules
        # We want to restrict list/view to the owner OR if show_on_profile is true
        links_rule = "user_id = @request.auth.id || show_on_profile = true"
        cursor.execute("UPDATE _collections SET listRule = ?, viewRule = ? WHERE name = 'links'", (links_rule, links_rule))
        print(f"Updated 'links' collection listRule and viewRule to: {links_rule}")

        # 2. Update 'users' collection view rule
        # We need to allow public viewing of profiles (PocketBase automatically hides sensitive fields like email, password)
        users_rule = "" # Empty string means public access
        cursor.execute("UPDATE _collections SET viewRule = ? WHERE name = 'users'", (users_rule,))
        print(f"Updated 'users' collection viewRule to public (empty string)")

        conn.commit()
        print("Successfully applied security rules to PocketBase SQLite database.")
        print("NOTE: You must RESTART the PocketBase server for the changes to take effect.")

    except Exception as e:
        print(f"Error updating rules: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    update_security_rules()
