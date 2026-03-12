#!/bin/sh
# Remove any hooks that were previously pushed into pb_data via SSH
rm -rf /pb/pb_data/pb_hooks 2>/dev/null || true

# Start PocketBase
exec /pb/pocketbase serve --http=0.0.0.0:8080
