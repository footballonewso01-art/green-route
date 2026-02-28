import sqlite3
import json

db_path = "pocketbase/pb_data/logs.db"
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # Query the last 5 failed requests
    cursor.execute("""
        SELECT url, method, status, error, details, created
        FROM _requests
        WHERE status >= 400
        ORDER BY created DESC
        LIMIT 5
    """)
    rows = cursor.fetchall()
    
    if not rows:
        print("No errors found in logs.")
    for row in rows:
        print(f"Time: {row[5]}")
        print(f"Request: {row[1]} {row[0]}")
        print(f"Status: {row[2]}")
        print(f"Error: {row[3]}")
        try:
            details_json = json.loads(row[4])
            print(f"Details: {json.dumps(details_json, indent=2)}")
        except:
            print(f"Details: {row[4]}")
        print("-" * 50)
        
    conn.close()
except Exception as e:
    print(f"Database error: {e}")
