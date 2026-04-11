/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  // Delete all error logs from before the fix (2026-04-10 21:39:34Z)
  // This will reset the Admin Dashboard's System Health metrics to 0% error rate.
  const rebootTime = "2026-04-10 21:40:00";
  
  db.newQuery("DELETE FROM system_logs WHERE level = 'error' AND created < {:rebootTime}")
    .bind({ rebootTime })
    .execute();
}, (db) => {
  // No undo for deletion
})
