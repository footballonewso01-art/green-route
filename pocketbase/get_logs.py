import subprocess

print("Fetching Fly logs...")
try:
    result = subprocess.run(
        ["fly", "logs", "-a", "greenroute-pb"],
        capture_output=True, text=True, timeout=5
    )
except subprocess.TimeoutExpired as e:
    logs = e.output if e.output else "No stdout"
    err = e.stderr if e.stderr else "No stderr"
    print("STDOUT:")
    print(logs[-2000:])
    print("STDERR:")
    print(err[-2000:])
