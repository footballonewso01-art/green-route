import sqlite3

db_path = 'pocketbase/pb_data/data.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def update_rules(collection_name, new_list, new_view, new_update, new_delete):
    cursor.execute('SELECT id FROM _collections WHERE name = ?', (collection_name,))
    row = cursor.fetchone()
    if row:
        cursor.execute('''UPDATE _collections 
                          SET listRule = ?, viewRule = ?, updateRule = ?, deleteRule = ? 
                          WHERE id = ?''', 
                       (new_list, new_view, new_update, new_delete, row[0]))
        print('Updated rules for ' + collection_name)
    else:
        print('Collection not found: ' + collection_name)

adm_cond = '@request.auth.role = "admin"'

u_rule = adm_cond + ' || id = @request.auth.id'
l_rule = adm_cond + ' || user_id = @request.auth.id'
c_rule = adm_cond + ' || link_id.user_id = @request.auth.id'

update_rules('users', u_rule, u_rule, u_rule, u_rule)
update_rules('links', l_rule, l_rule, l_rule, l_rule)
update_rules('clicks', c_rule, c_rule, c_rule, c_rule)

conn.commit()
conn.close()
print('API Rules updated.')
