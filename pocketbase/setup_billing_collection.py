import sqlite3
import json

db_path = 'pocketbase/pb_data/data.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT id FROM _collections WHERE name='billing'")
row = c.fetchone()
if not row:
    schema = [
        {'id': 'v6xq9zla', 'name': 'user_id', 'type': 'relation', 'system': False, 'required': True, 'options': {'collectionId': 'users', 'cascadeDelete': True, 'minSelect': None, 'maxSelect': 1, 'displayFields': []}},
        {'id': 'p2lw8ab1', 'name': 'plan', 'type': 'text', 'system': False, 'required': True, 'options': {'min': None, 'max': None, 'pattern': ''}},
        {'id': 'm3x9b2q5', 'name': 'amount', 'type': 'number', 'system': False, 'required': True, 'options': {'min': None, 'max': None}},
        {'id': 'k8v2n1m4', 'name': 'status', 'type': 'text', 'system': False, 'required': True, 'options': {'min': None, 'max': None, 'pattern': ''}},
        {'id': 'l7b6v5c4', 'name': 'payment_method', 'type': 'text', 'system': False, 'required': False, 'options': {'min': None, 'max': None, 'pattern': ''}}
    ]
    
    list_rule = "@request.auth.role = 'admin' || user_id = @request.auth.id"
    view_rule = "@request.auth.role = 'admin' || user_id = @request.auth.id"
    create_rule = ""
    update_rule = "@request.auth.role = 'admin'"
    delete_rule = "@request.auth.role = 'admin'"
    
    c.execute("""
        INSERT INTO _collections (
            id, system, type, name, schema, indexes, listRule, viewRule, createRule, updateRule, deleteRule, options, created, updated
        ) VALUES (
            'wobillingcollect', 0, 'base', 'billing', ?, '[]', ?, ?, ?, ?, ?, '{}', datetime('now'), datetime('now')
        )
    """, (json.dumps(schema), list_rule, view_rule, create_rule, update_rule, delete_rule))
    
    c.execute("""
        CREATE TABLE billing (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            plan TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL,
            payment_method TEXT,
            created TEXT DEFAULT (datetime('now')),
            updated TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    print('Created billing collection')
else:
    print('Billing collection already exists')
conn.close()
