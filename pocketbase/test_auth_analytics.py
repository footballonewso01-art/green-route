import urllib.request
import json
import ssl
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE = "https://greenroute-pb.fly.dev"

# Step 1: Authenticate
print("=== Step 1: Authenticating ===")
auth_data = json.dumps({
    "identity": "m@linktery.com",
    "password": "123456789aA"
}).encode('utf-8')

req = urllib.request.Request(
    f"{BASE}/api/collections/users/auth-with-password",
    data=auth_data,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, context=ctx, timeout=15) as res:
        auth_resp = json.loads(res.read().decode('utf-8'))
        token = auth_resp["token"]
        user_id = auth_resp["record"]["id"]
        print(f"Auth OK! user_id={user_id}, token={token[:20]}...")
except Exception as e:
    print(f"Auth FAILED: {e}")
    if hasattr(e, 'read'):
        print(f"Body: {e.read().decode('utf-8')}")
    exit(1)

# Step 2: Call analytics endpoint
print("\n=== Step 2: Calling /api/analytics/stats ===")
start = time.time()
analytics_req = urllib.request.Request(
    f"{BASE}/api/analytics/stats?period=7d",
    headers={
        "Authorization": token,
        "Content-Type": "application/json"
    },
    method="GET"
)

try:
    with urllib.request.urlopen(analytics_req, context=ctx, timeout=60) as res:
        elapsed = time.time() - start
        body = res.read().decode('utf-8')
        print(f"STATUS: {res.status} (took {elapsed:.2f}s)")
        # Print first 500 chars
        print(f"BODY: {body[:500]}")
except Exception as e:
    elapsed = time.time() - start
    print(f"ERROR (took {elapsed:.2f}s): {e}")
    if hasattr(e, 'read'):
        err_body = e.read().decode('utf-8')
        print(f"ERROR BODY: {err_body[:500]}")
