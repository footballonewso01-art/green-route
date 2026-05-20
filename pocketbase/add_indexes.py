import subprocess

indexes = [
    "CREATE INDEX IF NOT EXISTS idx_clicks_link ON clicks (link_id)",
    "CREATE INDEX IF NOT EXISTS idx_clicks_created ON clicks (created)",
    "CREATE INDEX IF NOT EXISTS idx_clicks_link_created ON clicks (link_id, created)",
    "CREATE INDEX IF NOT EXISTS idx_links_user ON links (user_id)",
]

for sql in indexes:
    print(f"Running: {sql}")
    cmd = [
        "fly", "ssh", "console",
        "-a", "greenroute-pb",
        "-C", f'sqlite3 /pb/pb_data/data.db "{sql}"'
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    print(f"  stdout: {res.stdout.strip()}")
    print(f"  stderr: {res.stderr.strip()}")
    print(f"  returncode: {res.returncode}")
    print()

# Verify
print("=== Verifying indexes ===")
verify_cmd = [
    "fly", "ssh", "console",
    "-a", "greenroute-pb",
    "-C", "sqlite3 /pb/pb_data/data.db '.indexes clicks'"
]
res = subprocess.run(verify_cmd, capture_output=True, text=True, timeout=30)
print(f"Clicks indexes: {res.stdout.strip()}")

verify_cmd2 = [
    "fly", "ssh", "console",
    "-a", "greenroute-pb",
    "-C", "sqlite3 /pb/pb_data/data.db '.indexes links'"
]
res2 = subprocess.run(verify_cmd2, capture_output=True, text=True, timeout=30)
print(f"Links indexes: {res2.stdout.strip()}")
