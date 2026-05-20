import urllib.request, ssl, re
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
url = "https://linktery.com/assets/index-BaWJp-MY.js"
with urllib.request.urlopen(url, context=ctx, timeout=30) as res:
    js = res.read().decode('utf-8')
prices = re.findall(r'price_1[A-Za-z0-9]+', js)
for p in sorted(set(prices)):
    print(p)
print(f"\nTotal unique price IDs: {len(set(prices))}")

# Check which set
test_ids = ["price_1TA5an1kCVZzZn9tUlnIjzjp", "price_1TA5mP1kCVZzZn9toW9b7xcU", "price_1TA5ay1kCVZzZn9thZD9Rhsi", "price_1TA5mh1kCVZzZn9tN3UmsgCC"]
live_ids = ["price_1T9ogj1kCVZzZn9tLvSa7km6", "price_1TA5k11kCVZzZn9tvsRkAGHW", "price_1T9ojK1kCVZzZn9tmOrvoNOn", "price_1TA5kT1kCVZzZn9tAP7AsNjs"]
found_test = [p for p in prices if p in test_ids]
found_live = [p for p in prices if p in live_ids]
print(f"\nTest prices found: {len(found_test)} -> {found_test[:3]}")
print(f"Live prices found: {len(found_live)} -> {found_live[:3]}")
