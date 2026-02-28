import sqlite3
import json

conn = sqlite3.connect('pocketbase/pb_data/data.db')
c = conn.cursor()
c.execute("SELECT schema FROM _collections WHERE name='links'")
schema = json.loads(c.fetchone()[0])
field_names = [f['name'] for f in schema]

ui_fields = ['title', 'destination_url', 'slug', 'order', 'active', 'show_on_profile', 'icon_type', 'icon_value', 'mode']

missing = [f for f in ui_fields if f not in field_names]
print(f"Missing from links schema: {missing}")
