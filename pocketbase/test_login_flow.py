"""Test that PocketBase auth (user login) still works."""
import requests

PB_URL = "http://127.0.0.1:8090"

def main():
    # Test user registration
    print("Testing user registration...")
    r = requests.post(f"{PB_URL}/api/collections/users/records", json={
        "email": "logintest_final@example.com",
        "password": "Test123456!",
        "passwordConfirm": "Test123456!",
        "name": "Login Test",
        "plan": "creator",
        "role": "user"
    }, timeout=5)
    print(f"  Register: {r.status_code} {r.text[:200]}")

    # Test user login
    print("\nTesting user login...")
    r2 = requests.post(f"{PB_URL}/api/collections/users/auth-with-password", json={
        "identity": "logintest_final@example.com",
        "password": "Test123456!"
    }, timeout=5)
    print(f"  Login: {r2.status_code}")
    if r2.status_code == 200:
        data = r2.json()
        print(f"  Token: {data.get('token', 'NONE')[:30]}...")
        record = data.get('record', {})
        print(f"  User ID: {record.get('id')}")
        print(f"  Email: {record.get('email')}")
        print(f"  Role: {record.get('role')}")
        print(f"  Plan: {record.get('plan')}")
    else:
        print(f"  Error: {r2.text[:300]}")

    # Test with existing user
    print("\nTesting login with test@mail.com...")
    r3 = requests.post(f"{PB_URL}/api/collections/users/auth-with-password", json={
        "identity": "test@mail.com",
        "password": "Test123456!"
    }, timeout=5)
    print(f"  Login: {r3.status_code} {r3.text[:200]}")

if __name__ == "__main__":
    main()
