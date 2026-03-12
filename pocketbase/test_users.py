import urllib.request, json
try:
    with urllib.request.urlopen("https://greenroute-pb.fly.dev/api/collections/users/records?sort=-created&perPage=20") as response:
        data = json.loads(response.read().decode())
        for user in data.get("items", []):
            print(f"[{user['created']}] {user['username']} - last_changed: '{user.get('username_last_changed', '')}'")
except Exception as e:
    print(e)
