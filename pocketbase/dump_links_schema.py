import sqlite3
import json

def main():
    conn = sqlite3.connect('pocketbase/pb_data/data.db')
    cursor = conn.cursor()
    cursor.execute('SELECT schema FROM _collections WHERE name="links"')
    row = cursor.fetchone()
    if row:
        print(row[0])
    conn.close()

if __name__ == "__main__":
    main()
