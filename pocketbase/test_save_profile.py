import requests
import json
import sys

base_url = "http://127.0.0.1:8090"

try:
    auth_res = requests.post(
        f"{base_url}/api/collections/users/auth-with-password",
        json={"identity": "admin@greenroute.dev", "password": "Password123!"} 
    )
    auth_data = auth_res.json()
    token = auth_data['token']
    user = auth_data['record']

    update_data = {
        "name": user.get("name", "Test"),
        "username": user.get("username", "testuser123"),
        "bio": user.get("bio", "Test bio"),
        "theme": user.get("theme", "minimal-dark"),
        "social_links": []
    }

    update_res = requests.patch(
        f"{base_url}/api/collections/users/records/{user['id']}",
        headers={"Authorization": token, "Content-Type": "application/json"},
        json=update_data
    )
    
    with open("pocketbase/error_out.json", "w") as f:
        json.dump({"status": update_res.status_code, "response": update_res.json()}, f, indent=2)

except Exception as e:
    with open("pocketbase/error_out.json", "w") as f:
        f.write(str(e))
