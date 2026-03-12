import subprocess
import time

print("Fetching secret...")
out = subprocess.check_output('fly ssh console --app greenroute-pb -q -C "sh -c \\"printenv STRIPE_SECRET_KEY\\""', shell=True).decode('utf-8').strip()

# Cleanup ssh artifacts if any
lines = [L.strip() for L in out.split('\n') if L.strip() and not L.startswith('Connecting')]
key = lines[-1] if lines else ""

print(f"Setting target secret starting with: {key[:15]}...")
if key:
    subprocess.check_call(f"fly secrets set STRIPE_SECRET_KEY={key} --app greenroute-pb-staging", shell=True)
    print("Done!")
else:
    print("Failed to locate key")
