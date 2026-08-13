migrate((app) => {
  // Durable cursor for the slow, full-history Stripe invoice audit. The
  // realtime webhook and rolling recent-window reconciliation remain the fast
  // paths; this cursor guarantees that older invoices are eventually revisited
  // even after an unusually long outage.
  app.db().newQuery(`
    CREATE TABLE IF NOT EXISTS _affiliate_reconciliation_state (
      id TEXT PRIMARY KEY NOT NULL,
      cursor TEXT NOT NULL DEFAULT '',
      updated TEXT NOT NULL DEFAULT (datetime('now'))
    ) WITHOUT ROWID
  `).execute();

  app.db().newQuery(`
    INSERT INTO _affiliate_reconciliation_state (id, cursor, updated)
    VALUES ('paid_invoice_history', '', datetime('now'))
    ON CONFLICT(id) DO NOTHING
  `).execute();
}, (app) => {
  // Financial recovery state is intentionally retained on rollback. Older
  // hooks ignore this private table, and a future upgrade can resume safely.
});
