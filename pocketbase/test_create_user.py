import requests
import json

base_url = "http://127.0.0.1:8090/api/collections/users/records"

data = {
    "email": "test_agent@example.com",
    "password": "Password123!",
    "passwordConfirm": "Password123!",
    "name": "Test Agent"
}

try:
    response = requests.post(base_url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
