import requests

# Test Production
URL = "https://greenroute-pb.fly.dev/api/stripe/create-checkout"

# We just need to trigger the stripe request and see if it 
# fails with "test mode key" or "live mode key". 
# The easiest way is to push a known LIVE price ID 
# without valid auth, or we can just read the webhook endpoint if it leaks info.

# But actually, the user's error message already tells us!
# "message": "No such price: 'price_1T9ogj1kCVZzZn9tLvSa7km6'; a similar object exists in live mode, but a test mode key was used to make this request."
# This proves greenroute-pb (Production) has a sk_test_... key!
