import urllib.request
import json
try:
    with urllib.request.urlopen("https://greenroute-pb.fly.dev/api/pv?u=sainte") as r:
        print(r.read().decode())
except urllib.error.HTTPError as e:
    print(e.read().decode())
