import urllib.request
import urllib.error
try:
    with urllib.request.urlopen("https://greenroute-pb.fly.dev/api/pv?u=sainte") as r:
        open("out.json", "wb").write(r.read())
except urllib.error.HTTPError as e:
    open("out.json", "wb").write(e.read())
