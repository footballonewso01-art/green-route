#!/bin/sh
sqlite3 /pb/pb_data/data.db "DELETE FROM _processed_stripe_events WHERE id LIKE 'evt_1TQtex%';"
echo "Cleaned up blocked events"
sqlite3 /pb/pb_data/data.db "SELECT COUNT(*) FROM _processed_stripe_events;"
