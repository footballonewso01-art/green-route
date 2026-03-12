import requests
import json
import string
import random

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

base_url = "https://greenroute-pb.fly.dev"
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
r = requests.post(f"{base_url}/api/collections/users/records", json=data)
print("Create Status:", r.status_code)
if r.status_code == 200:
    record = r.json()
    user_id = record['id']
    print("User Record:", record)
    
    # Now let's try to update the username!
    # First we need to log in to get a token!
    auth_data = {
        "identity": email,
        "password": password
    }
    r_auth = requests.post(f"{base_url}/api/collections/users/auth-with-password", json=auth_data)
    token = r_auth.json()['token']
    
    headers = {"Authorization": f"Bearer {token}"}
    update_data = {"username": f"newname_{random_string()}"}
    print("Updating username...")
    r_update = requests.patch(f"{base_url}/api/collections/users/records/{user_id}", json=update_data, headers=headers)
    print("Update status:", r_update.status_code)
    print("Update response:", r_update.text)
else:
    print("Error:", r.text)
