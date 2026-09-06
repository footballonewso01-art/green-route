migrate((app) => {
  const duplicates = arrayOf(new DynamicModel({ code: "", count: 0 }));
  app.db().newQuery(`
    SELECT lower(code) AS code, count(id) AS count
    FROM promocodes
    GROUP BY lower(code)
    HAVING count(id) > 1
    LIMIT 1
  `).all(duplicates);
  if (duplicates.length) {
    throw new Error("Cannot enforce global promocode uniqueness while case-insensitive duplicate codes exist");
  }
  app.db().newQuery(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_promocodes_code_nocase ON promocodes (code COLLATE NOCASE)"
  ).execute();
}, (app) => {
  app.db().newQuery("DROP INDEX IF EXISTS idx_promocodes_code_nocase").execute();
});
