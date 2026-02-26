import sqlite3
import os

db_path = r"d:\route-smartly-now-main\pocketbase\pb_data\data.db"

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Dumping 'users' table info:")
    cursor.execute("PRAGMA table_info(users);")
    columns = cursor.fetchall()
    for col in columns:
        print(col)
        
    print("\nChecking for any other tables related to 'links':")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    for table in tables:
        if 'link' in table[0].lower():
            print(f"Table found: {table[0]}")
            
    conn.close()
except Exception as e:
    print(f"Error: {e}")
