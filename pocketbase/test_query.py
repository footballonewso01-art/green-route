import subprocess

sql = "select method, path, status, errorMessage from requests order by created desc limit 20;"
cmd = [
    "fly", "ssh", "console", 
    "-a", "greenroute-pb", 
    "-C", f"sqlite3 /pb/pb_data/logs.db \"{sql}\""
]

print("Running command:", cmd)
res = subprocess.run(cmd, capture_output=True, text=True)
print("STDOUT:")
print(res.stdout)
print("STDERR:")
print(res.stderr)
