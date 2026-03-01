import sqlite3
import json
import os

DB_PATH = "pocketbase/pb_data/data.db"

def fix_order_field():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id, schema FROM _collections WHERE name='links'")
        row = cursor.fetchone()
        if not row:
            print("Links collection not found.")
            return

        cid, schema_json = row
        schema = json.loads(schema_json)

        for field in schema:
            if field['name'] == 'order':
                print(f"Current 'order' type: {field['type']}, options: {field.get('options')}")
                # Revert to date type (original type in pb_schema.json)
                field['type'] = 'date'
                field['options'] = {"min": "", "max": ""}
                print(f"Fixed 'order' type to: date")

        new_schema_json = json.dumps(schema)
        cursor.execute("UPDATE _collections SET schema=? WHERE id=?", (new_schema_json, cid))
        conn.commit()
        print("Order field type reverted to 'date' successfully.")

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_order_field()
