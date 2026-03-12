import requests

BASE = 'https://greenroute-pb.fly.dev'

print('Authenticating as AdminBot...')
auth = requests.post(f'{BASE}/api/collections/_superusers/auth-with-password', json={
    'identity': 'admin_bot@linktery.com',
    'password': 'FixBot123456!'
}, timeout=10)

if auth.status_code == 200:
    token = auth.json()['token']
    headers = {'Authorization': token}
    
    print('Fetching links collection...')
    coll = requests.get(f'{BASE}/api/collections/links', headers=headers).json()
    fields = coll.get('fields', [])
    modified = False
    
    for field in fields:
        if field.get('name') == 'icon_value':
            print('Found icon_value field. Current configuration:', field)
            # PocketBase defaults to 5000 if max is missing or 0 in some cases on v0.24.4.
            # Let's explicitly set a very high max limit.
            field['max'] = 5000000 
            modified = True
            print('Modified field:', field)

    if modified:
        print('Sending patch update...')
        res = requests.patch(f'{BASE}/api/collections/links', headers=headers, json={'fields': fields})
        print('Patch result:', res.status_code, res.text[:200])
else:
    print('Admin auth failed:', auth.status_code, auth.text)
