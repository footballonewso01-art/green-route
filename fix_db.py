
import sqlite3
import json

conn = sqlite3.connect('pocketbase/pb_data/data.db')
cursor = conn.cursor()

cursor.execute('SELECT id, fields FROM _collections WHERE name="analytics_daily"')
row = cursor.fetchone()
if row:
    fields = json.loads(row[1])
    for f in fields:
        if f['name'] == 'link_id':
            f['id'] = 'f_link_id_1'
        elif f['name'] == 'day':
            f['id'] = 'f_day_1'
        elif f['name'] == 'count':
            f['id'] = 'f_count_1'
            
    cursor.execute('UPDATE _collections SET fields=? WHERE id=?', (json.dumps(fields), row[0]))
    conn.commit()
    print('Fixed field IDs!')
else:
    print('Collection not found')

