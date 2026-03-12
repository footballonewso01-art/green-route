import requests

base_url = "https://greenroute-pb.fly.dev"

# Wait, I don't know the exact user ID, but I can create a new user to test!
import string
import random

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

email = f"test_{random_string()}@example.com"
password = "password123"
username = f"user_{random_string()}"

print(f"Creating user {email} ...")
data = {
    "email": email,
    "password": password,
    "passwordConfirm": password,
    "username": username,
    "name": "Test User"
}
# local pb might be running on 8090
try:
    r = requests.post("http://127.0.0.1:8090/api/collections/users/records", json=data)
    print("Local Create Status:", r.status_code)
    if r.status_code == 200:
        record = r.json()
        print("username_last_changed:", repr(record.get("username_last_changed")))
    else:
        print("Error:", r.text)
except Exception as e:
    print("Local error", e)
