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
    print('Keys found:', coll.keys())
    
    fields = coll.get('fields', [])
    modified = False
    
    for field in fields:
        if field.get('name') == 'icon_value':
            print('Found icon_value field. Current configuration:', field)
            try:
                # Remove 'max' entirely or set to huge limit
                if 'max' in field:
                    del field['max']
                    modified = True
                if field.get('maxSelect'):
                    pass
            except Exception as e:
                print('Error updating field', e)
                
            # As fallback, just set max to None if it doesn't work by deleting
            if 'max' in field or 'options' in field:
                field['max'] = None
                modified = True
            
            # Print after modification
            print('Modified field:', field)

    if modified:
        print('Sending patch update...')
        res = requests.patch(f'{BASE}/api/collections/links', headers=headers, json={'fields': fields})
        print('Patch result:', res.status_code, res.text[:200])
    else:
        print('Could not find max length limit to remove.')
else:
    print('Admin auth failed:', auth.status_code, auth.text)
