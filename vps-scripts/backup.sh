#!/bin/bash
set -e

BACKUP_DIR="../pocketbase/pb_data/backups_vps"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

echo "=== Creating Backup: $BACKUP_FILE ==="
# Pause the container for safe SQLite copy
docker compose pause pocketbase

# Create tar archive of the database
tar -czf "$BACKUP_FILE" -C ../pocketbase pb_data/data.db pb_data/logs.db

# Resume the container
docker compose unpause pocketbase

echo "=== Backup Complete ==="
ls -lh "$BACKUP_FILE"
