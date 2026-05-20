import subprocess

sql = "SELECT date(c.created) as date, count(c.id) as clicks FROM clicks c WHERE c.created >= datetime('now', '-7 days') GROUP BY date ORDER BY date ASC LIMIT 5;"
cmd = [
    "fly", "ssh", "console", 
    "-a", "greenroute-pb", 
    "-C", f"sqlite3 /pb/pb_data/data.db \"{sql}\""
]

print("Running command:", cmd)
res = subprocess.run(cmd, capture_output=True, text=True)
print("STDOUT:")
print(res.stdout)
print("STDERR:")
print(res.stderr)
