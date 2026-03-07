import subprocess
import base64

sql = """
UPDATE _collections SET updateRule = '@request.auth.role = ''admin'' || id = @request.auth.id' WHERE name = 'users';
UPDATE _collections SET createRule = '@request.auth.role = ''admin''', updateRule = '@request.auth.role = ''admin''' WHERE name = 'billing';
"""

b64_sql = base64.b64encode(sql.encode('utf-8')).decode('utf-8')

cmd = [
    "flyctl", "ssh", "console", "-a", "greenroute-pb", "-C",
    f"echo {b64_sql} | base64 -d | sqlite3 /pb/pb_data/data.db"
]

print("Executing SQL update via base64 passing...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print(f"Error: {res.stderr}")
else:
    print("Success. Restarting PocketBase...")
    subprocess.run(["flyctl", "ssh", "console", "-a", "greenroute-pb", "-C", "killall pocketbase"])
    print("Restarted.")
