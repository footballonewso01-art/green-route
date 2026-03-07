import subprocess

def run_sql(sql_command):
    cmd = [
        "flyctl", "ssh", "console", "-a", "greenroute-pb", "-C",
        f"sqlite3 /pb/pb_data/data.db \"{sql_command}\""
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    else:
        print(f"Success: {result.stdout}")

run_sql("SELECT id, email, role_text_fld FROM users;")
