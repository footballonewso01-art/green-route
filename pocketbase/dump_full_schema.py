import sqlite3
import json

def dump_full_schema():
    conn = sqlite3.connect('pocketbase/pb_data/data.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, type, listRule, viewRule, createRule, updateRule, deleteRule, schema FROM _collections')
    rows = cursor.fetchall()
    
    collections = []
    for r in rows:
        collections.append({
            'id': r[0],
            'name': r[1],
            'type': r[2],
            'listRule': r[3],
            'viewRule': r[4],
            'createRule': r[5],
            'updateRule': r[6],
            'deleteRule': r[7],
            'schema': json.loads(r[8])
        })
    
    with open('pocketbase/full_schema_dump.json', 'w', encoding='utf-8') as f:
        json.dump(collections, f, indent=2)
    
    conn.close()

if __name__ == "__main__":
    dump_full_schema()
