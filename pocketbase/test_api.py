import urllib.request
import json
import ssl

def check_api():
    # Login as one of the users
    req = urllib.request.Request(
        'http://127.0.0.1:8090/api/collections/users/records?perPage=1',
        headers={'Content-Type': 'application/json'}
    )
    # this will fail 403 or 401 if unauthenticated, let's see what it returns
    try:
        res = urllib.request.urlopen(req)
        print("Response:", res.read().decode())
    except Exception as e:
        print("Error:", e)

    # try to authenticate with the existing user (if we know the password)
    # just print the first user's email from db
    import sqlite3
    conn = sqlite3.connect('pocketbase/pb_data/data.db')
    c = conn.cursor()
    c.execute("SELECT email, passwordHash FROM users LIMIT 1")
    user = c.fetchone()
    print("User in DB:", user)

if __name__ == '__main__':
    check_api()
