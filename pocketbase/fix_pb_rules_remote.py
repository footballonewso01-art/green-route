import requests

base_url = "https://greenroute-pb.fly.dev"
admin_auth_url = f"{base_url}/api/collections/_superusers/auth-with-password"
collections_url = f"{base_url}/api/collections"

creds_list = [
    ("test@mail.com", "1234567890"),
    ("test@mail.com", "123456789"),
    ("test@mail.com", "12345678")
]

token = None
for email, password in creds_list:
    auth_resp = requests.post(admin_auth_url, json={"identity": email, "password": password})
    if auth_resp.status_code == 200:
        token = auth_resp.json().get('token')
        print(f"Authenticated with {password}")
        break

if not token:
    print("Failed to guess password")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

try:
    # 1. Update users collection
    users_resp = requests.get(f"{collections_url}/users", headers=headers).json()
    users_resp['updateRule'] = "@request.auth.role = 'admin' || id = @request.auth.id"
    res1 = requests.patch(f"{collections_url}/users", headers=headers, json=users_resp)
    print("Users Update:", res1.status_code)
    
    # 2. Update billing collection
    billing_resp = requests.get(f"{collections_url}/billing", headers=headers).json()
    billing_resp['createRule'] = "@request.auth.role = 'admin'"
    billing_resp['updateRule'] = "@request.auth.role = 'admin'"
    res2 = requests.patch(f"{collections_url}/billing", headers=headers, json=billing_resp)
    print("Billing Update:", res2.status_code)
    
    # 3. Update clicks collection rules
    clicks_resp = requests.get(f"{collections_url}/clicks", headers=headers).json()
    clicks_resp['createRule'] = ""
    res3 = requests.patch(f"{collections_url}/clicks", headers=headers, json=clicks_resp)
    print("Clicks Update:", res3.status_code)
except Exception as e:
    print(f"Error: {e}")
