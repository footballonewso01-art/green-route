"""
Full diagnostic: dump rules and schema to file for inspection.
"""
import sqlite3
import json

DB_PATH = "pocketbase/pb_data/data.db"
OUTPUT = "pocketbase/diagnostic_output.txt"

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    lines = []

    cursor.execute('SELECT name, type, listRule, viewRule, createRule, updateRule, deleteRule, schema FROM _collections')
    rows = cursor.fetchall()

    for row in rows:
        name, ctype, listR, viewR, createR, updateR, deleteR, schema_json = row
        lines.append(f"\n=== {name} (type={ctype}) ===")
        lines.append(f"  list:   {repr(listR)}")
        lines.append(f"  view:   {repr(viewR)}")
        lines.append(f"  create: {repr(createR)}")
        lines.append(f"  update: {repr(updateR)}")
        lines.append(f"  delete: {repr(deleteR)}")
        if schema_json:
            try:
                schema = json.loads(schema_json)
                for f in schema:
                    lines.append(f"    field: {f['name']} (id={f.get('id')}) type={f['type']} system={f.get('system')}")
            except:
                lines.append("    CORRUPTED SCHEMA!")

    lines.append("\n=== USERS TABLE COLUMNS ===")
    cursor.execute("PRAGMA table_info(users)")
    for col in cursor.fetchall():
        lines.append(f"  {col[1]} ({col[2]})")

    lines.append("\n=== USERS DATA ===")
    cursor.execute("SELECT id, email, role, plan FROM users LIMIT 10")
    for row in cursor.fetchall():
        lines.append(f"  {row}")

    conn.close()

    output = "\n".join(lines)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(output)
    print(output)

if __name__ == "__main__":
    main()
