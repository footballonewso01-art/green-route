import sqlite3
import json
import os

DB_PATH = "pocketbase/pb_data/data.db"

def fix_schema_consistency():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Get the links collection
        cursor.execute("SELECT id, schema FROM _collections WHERE name='links'")
        row = cursor.fetchone()
        if not row:
            print("Links collection not found.")
            return

        cid, schema_json = row
        schema = json.loads(schema_json)
        
        new_schema = []
        for field in schema:
            name = field.get('name')
            ftype = field.get('type')
            
            # Clean up numeric options that might have empty strings from previous 'date' type
            if ftype == 'number' and 'options' in field:
                opts = field['options']
                if opts.get('min') == "": opts['min'] = None
                if opts.get('max') == "": opts['max'] = None
            
            # Ensure order is number if it's supposed to be (as per pb_schema.json)
            if name == 'order':
                field['type'] = 'number'
                if 'options' not in field: field['options'] = {}
                field['options']['onlyInt'] = False

            new_schema.append(field)

        new_schema_json = json.dumps(new_schema)
        cursor.execute("UPDATE _collections SET schema=? WHERE id=?", (new_schema_json, cid))
        conn.commit()
        print("Schema consistency fix applied (nullified empty bounds, verified types).")

    except Exception as e:
        print(f"Error during repair: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_schema_consistency()
