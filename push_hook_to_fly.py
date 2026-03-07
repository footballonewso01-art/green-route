import subprocess
import base64
import time

# Read the local main.pb.js file
with open("pocketbase/pb_hooks/main.pb.js", "r", encoding="utf-8") as f:
    content = f.read()

# Base64 encode it
b64 = base64.b64encode(content.encode("utf-8")).decode("utf-8")

# Split into 1500-char chunks (safe for shell)
chunk_size = 1500
chunks = [b64[i:i+chunk_size] for i in range(0, len(b64), chunk_size)]

print(f"Total size: {len(content)} bytes, base64: {len(b64)} chars, chunks: {len(chunks)}")

def fly_cmd(remote_cmd):
    result = subprocess.run(
        ["flyctl", "ssh", "console", "-a", "greenroute-pb", "-C", remote_cmd],
        capture_output=True, text=True, timeout=30
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()

# Write chunks to /tmp/pb_hook.b64
for i, chunk in enumerate(chunks):
    op = ">" if i == 0 else ">>"
    # Use printf to avoid echo issues
    rc, out, err = fly_cmd(f"printf '%s' '{chunk}' {op} /tmp/pb_hook.b64")
    if rc != 0:
        print(f"Chunk {i} FAILED: {err}")
        # Try alternative: tee
        rc2, out2, err2 = fly_cmd(f"/bin/sh -c \"printf '%s' '{chunk}' {op} /tmp/pb_hook.b64\"")
        if rc2 != 0:
            print(f"Chunk {i} ALT FAILED: {err2}")
            exit(1)
    print(f"  [{i+1}/{len(chunks)}] OK")
    time.sleep(0.3)

# Decode base64 and write to pb_hooks
rc, out, err = fly_cmd("base64 -d /tmp/pb_hook.b64 > /pb/pb_hooks/main.pb.js")
print(f"Decode: rc={rc}, out={out}, err={err}")

# Verify file size
rc, out, err = fly_cmd("wc -c /pb/pb_hooks/main.pb.js")
print(f"File size: {out}")

# Restart PocketBase (SIGHUP to reload)
rc, out, err = fly_cmd("kill -HUP 1")
print(f"Restart signal: rc={rc}")

print("Done!")
