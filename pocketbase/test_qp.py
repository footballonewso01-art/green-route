import urllib.request, json, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
url = "https://greenroute-pb.fly.dev/api/debug-qp?test=hello&period=7d&linkId=abc123"
try:
    with urllib.request.urlopen(url, context=ctx, timeout=30) as res:
        print(json.dumps(json.loads(res.read()), indent=2))
except Exception as e:
    print(f"ERROR: {e}")
    if hasattr(e, 'read'): print(e.read().decode())
