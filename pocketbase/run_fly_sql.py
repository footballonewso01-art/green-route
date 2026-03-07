import subprocess
import sys

def run_sql(sql_command):
    cmd = [
        "flyctl", "ssh", "console", "-a", "greenroute-pb", "-C",
        f"sqlite3 /pb/pb_data/data.db \"{sql_command}\""
    ]
    print(f"Executing: {sql_command}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    else:
        print(f"Success: {result.stdout}")

run_sql("UPDATE _collections SET updateRule = '@request.auth.role = ''admin'' || id = @request.auth.id' WHERE name = 'users';")
run_sql("UPDATE _collections SET createRule = '@request.auth.role = ''admin''', updateRule = '@request.auth.role = ''admin''' WHERE name = 'billing';")

run_sql("SELECT name, updateRule FROM _collections WHERE name IN ('users', 'billing');")
