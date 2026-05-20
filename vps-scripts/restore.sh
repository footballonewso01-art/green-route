#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <path_to_backup.tar.gz>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File $BACKUP_FILE not found!"
  exit 1
fi

echo "=== Restoring Backup: $BACKUP_FILE ==="
echo "WARNING: This will overwrite your current database."
read -p "Are you sure? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo "Stopping PocketBase..."
docker compose stop pocketbase

echo "Extracting backup..."
# Extract data.db and logs.db
tar -xzf "$BACKUP_FILE" -C ../pocketbase

echo "Starting PocketBase..."
docker compose start pocketbase

echo "=== Restore Complete ==="
