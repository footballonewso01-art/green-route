import urllib.request
import urllib.parse
import json

PB_URL = "http://127.0.0.1:8090"
ADMIN_EMAIL = "admin@greenroute.dev"
ADMIN_PASS = "admin12345"

def get_admin_token():
    try:
        data = json.dumps({"identity": "test@mail.com", "password": "password"}).encode("utf-8") # From previous DB info o6x1jnqbe8km1e9 is test@mail.com, wait we don't know the password.
        # Let's just create an admin. Wait, admin is different from auth user.
    except Exception as e:
        print(e)

# Instead of auth, let's just observe the pb_data/logs.db or maybe we can just query the schema directly again to find what could be wrong.
