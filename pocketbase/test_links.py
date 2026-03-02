import sqlite3

def check_db():
    conn = sqlite3.connect('pocketbase/pb_data/data.db')
    c = conn.cursor()
    
    # Check what is in the _collections table
    c.execute("SELECT id, name FROM _collections")
    colls = c.fetchall()
    print("Collections:", colls)
    
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [t[0] for t in c.fetchall()]
    
    if 'links' in tables:
        c.execute("SELECT count(*) FROM links")
        print("Links count:", c.fetchone()[0])
        c.execute("SELECT id, user_id, destination_url FROM links LIMIT 2")
        print("Links data:", c.fetchall())
        
    if 'clicks' in tables:
        c.execute("SELECT count(*) FROM clicks")
        print("Clicks count:", c.fetchone()[0])

if __name__ == '__main__':
    check_db()
