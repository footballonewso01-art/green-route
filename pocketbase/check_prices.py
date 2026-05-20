import urllib.request, ssl, re
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Get index.html to find current JS bundle filename
with urllib.request.urlopen("https://linktery.com", context=ctx, timeout=15) as res:
    html = res.read().decode('utf-8')

js_match = re.search(r'src="/assets/(index-[^"]+\.js)"', html)
if not js_match:
    print("ERROR: Could not find JS bundle in HTML")
    exit(1)

js_file = js_match.group(1)
print(f"Current bundle: {js_file}")

# 2. Fetch the bundle and check price IDs
url = f"https://linktery.com/assets/{js_file}"
print(f"Fetching: {url}")
with urllib.request.urlopen(url, context=ctx, timeout=30) as res:
    js = res.read().decode('utf-8')

prices = re.findall(r'price_1[A-Za-z0-9]+', js)
for p in sorted(set(prices)):
    print(f"  {p}")

test_ids = ["price_1TA5an1kCVZzZn9tUlnIjzjp", "price_1TA5mP1kCVZzZn9toW9b7xcU", "price_1TA5ay1kCVZzZn9thZD9Rhsi", "price_1TA5mh1kCVZzZn9tN3UmsgCC"]
live_ids = ["price_1T9ogj1kCVZzZn9tLvSa7km6", "price_1TA5k11kCVZzZn9tvsRkAGHW", "price_1T9ojK1kCVZzZn9tmOrvoNOn", "price_1TA5kT1kCVZzZn9tAP7AsNjs"]
found_test = [p for p in prices if p in test_ids]
found_live = [p for p in prices if p in live_ids]
print(f"\nTEST prices in bundle: {len(found_test)}")
print(f"LIVE prices in bundle: {len(found_live)}")

if found_live and not found_test:
    print("\n✅ FIX DEPLOYED! Bundle has LIVE prices only.")
elif found_test and not found_live:
    print("\n❌ STILL BROKEN — bundle has TEST prices only!")
elif not found_test and not found_live:
    print("\n⚠️ NO prices found at all — Vite may have tree-shaken both!")
