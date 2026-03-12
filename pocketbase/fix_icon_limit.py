import requests
import sqlite3
import json

try:
    # Connect directly to the database file over SSH
    print('Connecting to pb_data/data.db...')
    conn = sqlite3.connect('/pb/pb_data/data.db')
    c = conn.cursor()
    
    print('Fetching links collection schema...')
    c.execute('SELECT schema FROM _collections WHERE name="links"')
    schema_json = c.fetchone()[0]
    schema = json.loads(schema_json)
    
    modified = False
    for field in schema:
        if field['name'] == 'icon_value':
            print('Found icon_value field, current max:', field.get('options', {}).get('max'))
            if 'options' not in field:
                field['options'] = {}
            field['options']['max'] = None
            modified = True
            
    if modified:
        print('Updating schema in database...')
        c.execute('UPDATE _collections SET schema = ? WHERE name="links"', (json.dumps(schema),))
        conn.commit()
        print('Schema updated successfully! Base64 icons can now be saved.')
    else:
        print('No changes needed or field not found.')
        
    conn.close()
    
except Exception as e:
    print('Error:', e)
