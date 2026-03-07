UPDATE _collections SET updateRule = '@request.auth.role = ''admin'' || id = @request.auth.id' WHERE name = 'users';
UPDATE _collections SET createRule = '@request.auth.role = ''admin''', updateRule = '@request.auth.role = ''admin''' WHERE name = 'billing';
