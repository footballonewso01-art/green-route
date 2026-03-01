import sqlite3
import os

DB_PATH = "pocketbase/pb_data/data.db"
OUTPUT = "pocketbase/table_info.txt"

def main():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("PRAGMA table_info(links)")
        cols = cursor.fetchall()
        
        lines = ["=== links table info ==="]
        for col in cols:
            lines.append(f"cid: {col[0]}, name: {col[1]}, type: {col[2]}, notnull: {col[3]}, dflt_value: {col[4]}, pk: {col[5]}")
            
        output = "\n".join(lines)
        with open(OUTPUT, "w", encoding="utf-8") as f:
            f.write(output)
        print(output)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
