import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://greenroute-pb.fly.dev/api/debug-analytics"
print("Fetching:", url)
try:
    with urllib.request.urlopen(url, context=ctx, timeout=60) as res:
        print("STATUS:", res.status)
        print("BODY:", res.read().decode('utf-8'))
except Exception as e:
    print("HTTP ERROR:", e)
    if hasattr(e, 'read'):
        print("ERROR BODY:", e.read().decode('utf-8'))
