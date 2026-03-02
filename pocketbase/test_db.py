import sqlite3

def check_db():
    conn = sqlite3.connect('pocketbase/pb_data/data.db')
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = c.fetchall()
    print("Tables:", tables)
    
    # Check what is in the _collections table
    c.execute("SELECT id, name FROM _collections")
    colls = c.fetchall()
    print("Collections:", colls)
    
    # if 'users' table exists, query it
    if ('users',) in tables:
        c.execute("SELECT id, email, avatar FROM users LIMIT 1")
        print("Users data:", c.fetchall())

if __name__ == '__main__':
    check_db()
