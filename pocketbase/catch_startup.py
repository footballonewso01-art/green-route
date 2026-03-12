import subprocess
import time

print("Restarting app...")
subprocess.run(["fly", "apps", "restart", "greenroute-pb"])

print("Listening to logs...")
proc = subprocess.Popen(["fly", "logs", "-a", "greenroute-pb"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

start_time = time.time()
while time.time() - start_time < 20:
    line = proc.stdout.readline()
    if line:
        print(line, end="")
        if "error" in line.lower() or "syntax" in line.lower() or "exception" in line.lower():
            # Keep reading a bit more to get the full trace
            continue
    time.sleep(0.1)

proc.terminate()
