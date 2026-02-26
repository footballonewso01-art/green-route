import sqlite3
import os

db_path = r"d:\route-smartly-now-main\pocketbase\pb_data\data.db"

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Listing user accounts:")
    cursor.execute("SELECT id, email, username FROM users;")
    users = cursor.fetchall()
    for user in users:
        print(f"ID: {user[0]}, Email: {user[1]}, Username: {user[2]}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
