import urllib.request
import urllib.error
import json
import uuid

# 1. Create a user (using unique username)
user_email = f'test{uuid.uuid4().hex[:6]}@example.com'
user_pass = 'password123'
data = json.dumps({
    'email': user_email,
    'password': user_pass,
    'passwordConfirm': user_pass,
    'username': f'user{uuid.uuid4().hex[:8]}',
    'name': 'Test User'
}).encode('utf-8')

try:
    req = urllib.request.Request('https://greenroute-pb.fly.dev/api/collections/users/records', data=data, headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    user_data = json.loads(res.read())

    # 2. Auth user
    auth_data = json.dumps({
        'identity': user_email,
        'password': user_pass
    }).encode('utf-8')
    req = urllib.request.Request('https://greenroute-pb.fly.dev/api/collections/users/auth-with-password', data=auth_data, headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    auth_res = json.loads(res.read())
    token = auth_res['token']

    # 3. Hit analytics_daily
    req = urllib.request.Request('https://greenroute-pb.fly.dev/api/collections/analytics_daily/records', headers={'Authorization': token})
    res = urllib.request.urlopen(req)
    print('ANALYTICS STATUS:', res.status)
    print('ANALYTICS DATA:', res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('ERROR:', e.read().decode('utf-8'))
