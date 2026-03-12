import subprocess
import os

app_name = "greenroute-pb"

files = {
    "pocketbase/pb_hooks/main.pb.js": "/pb/pb_hooks/main.pb.js",
}

for local_path, remote_path in files.items():
    print(f"Uploading {local_path} to {remote_path}...")
    with open(local_path, "r", encoding="utf-8") as f:
        text_content = f.read()
    
    # Force Unix line endings to prevent Goja syntax errors on Alpine Linux
    content = text_content.replace("\r\n", "\n").encode("utf-8")

    # Create a command to write the exact content to the remote file using EOF heredoc via sh
    remote_dir = remote_path.rsplit('/', 1)[0]
    cmd = [
        "fly", "ssh", "console", "-q", "-C",
        f"sh -c 'mkdir -p {remote_dir} && cat > {remote_path}'",
        "--app", app_name
    ]
    
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = proc.communicate(input=content)

    if proc.returncode == 0:
        print(f"Success: {local_path}")
    else:
        print(f"Error ({proc.returncode}): {stderr.decode('utf-8', errors='ignore')}")

print("Restarting app...")
subprocess.run(["fly", "apps", "restart", app_name])
