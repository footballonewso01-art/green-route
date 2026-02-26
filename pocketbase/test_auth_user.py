import requests

base_url = "http://127.0.0.1:8090/api/collections/users/auth-with-password"

data = {
    "identity": "test_agent@example.com",
    "password": "Password123!"
}

try:
    response = requests.post(base_url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
