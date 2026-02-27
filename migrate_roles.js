const Database = require('better-sqlite3');
const db = new Database('pocketbase/pb_data/data.db');

console.log('Starting migration...');

const usersCollection = db.prepare("SELECT * FROM _collections WHERE name = 'users'").get();
if (usersCollection) {
    let schema = JSON.parse(usersCollection.schema);
    const hasRole = schema.some(f => f.name === 'role');

    if (!hasRole) {
        schema.push({
            system: false,
            id: 'users_role_field',
            name: 'role',
            type: 'text',
            required: false,
            presentable: false,
            unique: false,
            options: { min: null, max: null, pattern: '' }
        });

        db.prepare('UPDATE _collections SET schema = ? WHERE id = ?').run(JSON.stringify(schema), usersCollection.id);
        console.log('Added role field to users collection schema.');
    } else {
        console.log('Role field already exists in schema.');
    }
}

// Update existing users in the actual users table
try {
    const info = db.prepare("UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''").run();
    console.log(`Updated ${info.changes} users to have 'user' role.`);
} catch (e) {
    console.log('Could not set default roles, column may not be created yet by PocketBase.');
}

// Now let's print the collections we need to update API rules for
const collections = db.prepare("SELECT name, listRule, viewRule, createRule, updateRule, deleteRule FROM _collections WHERE name IN ('users', 'links', 'clicks')").all();
console.log('\nCurrent API Rules:');
console.log(JSON.stringify(collections, null, 2));

console.log('\nMigration complete.');
