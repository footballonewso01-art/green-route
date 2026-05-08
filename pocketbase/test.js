
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/pb/pb_data/data.db');
db.all('SELECT fields FROM _collections WHERE name="analytics_daily"', (err, rows) => {
    console.log(rows[0].fields);
});

