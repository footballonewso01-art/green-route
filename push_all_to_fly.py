import subprocess
import base64
import time

def fly_cmd(remote_cmd):
    result = subprocess.run(
        ["flyctl", "ssh", "console", "-a", "greenroute-pb", "-C", remote_cmd],
        input="", capture_output=True, text=True, timeout=30
    )
    rc = result.returncode
    err = result.stderr.strip()
    if rc != 0 and "The handle is invalid" in err:
        rc = 0
    return rc, result.stdout.strip(), err

def upload_file(local_path, remote_path):
    print(f"=== Uploading {local_path} to {remote_path} ===")
    
    with open(local_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    b64 = base64.b64encode(content.encode("utf-8")).decode("utf-8")
    chunk_size = 1500
    chunks = [b64[i:i+chunk_size] for i in range(0, len(b64), chunk_size)]
    
    print(f"File size: {len(content)} bytes, base64: {len(b64)} chars, chunks: {len(chunks)}")
    
    # Clear remote temp file
    fly_cmd("rm -f /tmp/pb_upload_temp.b64")
    
    for i, chunk in enumerate(chunks):
        op = ">" if i == 0 else ">>"
        rc, out, err = fly_cmd(f"/bin/sh -c \"printf '%s' '{chunk}' {op} /tmp/pb_upload_temp.b64\"")
        if rc != 0:
            print(f"Chunk {i} FAILED: {err}")
            return False
        print(f"  [{i+1}/{len(chunks)}] OK")
        time.sleep(0.15)
        
    # Decode to target location
    rc, out, err = fly_cmd(f"/bin/sh -c 'base64 -d /tmp/pb_upload_temp.b64 > {remote_path}'")
    print(f"Decode status: {rc}")
    
    # Verify file size
    rc, out, err = fly_cmd(f"wc -c {remote_path}")
    print(f"Verify remote size: {out}")
    
    # Cleanup temp file
    fly_cmd("rm -f /tmp/pb_upload_temp.b64")
    return True

# Upload all files
if upload_file("pocketbase/pb_hooks/utils.js", "/pb/pb_hooks/utils.js") and \
   upload_file("pocketbase/pb_hooks/main.pb.js", "/pb/pb_hooks/main.pb.js") and \
   upload_file("pocketbase/repair_db.py", "/pb/repair_db.py"):
    
    print("\n=== Running Database Schema Migrations ===")
    rc, out, err = fly_cmd("python3 /pb/repair_db.py")
    print(f"Migration run status: rc={rc}, output={out}, error={err}")
    
    print("\n=== Restarting PocketBase with SIGHUP ===")
    rc, out, err = fly_cmd("kill -HUP 1")
    print(f"Restart signal sent: rc={rc}")
    print("Done!")
else:
    print("FAILED to deploy updated hooks.")
