import requests
import time
import random

PB_URL = "https://greenroute-pb-staging.fly.dev"

# 1. Create a random user
num = random.randint(1000, 9999)
email = f"test_{num}@example.com"
password = "Password123!"

print(f"Creating user {email}...")
res = requests.post(f"{PB_URL}/api/collections/users/records", json={
    "email": email,
    "password": password,
    "passwordConfirm": password,
    "display_name": f"Test {num}"
})

if res.status_code != 200:
    print(f"Failed to create user: {res.status_code} {res.text}")
    exit(1)

# 2. Login to get token
print(f"Logging in...")
res = requests.post(f"{PB_URL}/api/collections/users/auth-with-password", json={
    "identity": email,
    "password": password
})

if res.status_code != 200:
    print(f"Failed to login: {res.status_code} {res.text}")
    exit(1)

token = res.json()["token"]

# 3. Call create-checkout
print("Calling create-checkout...")
checkout_res = requests.post(f"{PB_URL}/api/stripe/create-checkout", 
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    },
    json={"priceId": "price_1T9ogj1kCVZzZn9tLvSa7km6"}
)

print(f"Status: {checkout_res.status_code}")
print(f"Response: {checkout_res.text}")
