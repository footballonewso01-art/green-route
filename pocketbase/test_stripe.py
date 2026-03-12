import requests

# 1. Login to get token for test user
res = requests.post("https://greenroute-pb.fly.dev/api/collections/users/auth-with-password", json={
    "identity": "admin@greenroute.dev", # try another common one
    "password": "Password123!"
})

if res.status_code != 200:
    print("Trying test@example.com...")
    res = requests.post("https://greenroute-pb.fly.dev/api/collections/users/auth-with-password", json={
        "identity": "test@example.com",
        "password": "Password123!"
    })

if res.status_code != 200:
    print("Could not login:", res.text)
    print("Please create a test user test@example.com with Password123! or check the script.")
    exit(1)

token = res.json()["token"]

# 2. Call create-checkout
print("Calling create-checkout...")
checkout_res = requests.post("https://greenroute-pb.fly.dev/api/stripe/create-checkout", 
    headers={"Authorization": token}, # Front-end sends it like this in the fetch call!
    json={"priceId": "price_1T9ogj1kCVZzZn9tLvSa7km6"}
)

print(f"Status: {checkout_res.status_code}")
print(f"Body: {checkout_res.text}")
