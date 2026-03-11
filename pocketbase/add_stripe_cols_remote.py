"""
Add stripe columns to the remote billing table via fly ssh.
"""
import subprocess

app = "greenroute-pb"

commands = [
    "apk add --no-cache sqlite",
    "sqlite3 /pb/pb_data/data.db 'ALTER TABLE billing ADD COLUMN stripe_customer_id TEXT;'",
    "sqlite3 /pb/pb_data/data.db 'ALTER TABLE billing ADD COLUMN stripe_subscription_id TEXT;'",
    "sqlite3 /pb/pb_data/data.db 'PRAGMA table_info(billing);'",
]

for cmd in commands:
    print(f"\n>>> {cmd}")
    result = subprocess.run(
        ["fly", "ssh", "console", "-C", cmd, "--app", app],
        capture_output=True, text=True, timeout=30
    )
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.stderr.strip():
        print(f"STDERR: {result.stderr.strip()}")
    print(f"Exit: {result.returncode}")

print("\nRestarting app...")
subprocess.run(["fly", "apps", "restart", app], timeout=30)
print("Done!")
