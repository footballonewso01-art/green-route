import subprocess

print("Downloading remote main.pb.js...")
result = subprocess.run(
    ["fly", "ssh", "console", "-q", "-C", "cat /pb/pb_data/pb_hooks/main.pb.js", "--app", "greenroute-pb"],
    capture_output=True, text=True
)

if result.returncode == 0:
    with open("pocketbase/remote_main.pb.js", "w", encoding="utf-8") as f:
        f.write(result.stdout)
    print("Saved to pocketbase/remote_main.pb.js")
else:
    print("Error:", result.stderr)
