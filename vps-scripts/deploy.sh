#!/bin/bash
set -e

echo "=== Deploying Updates ==="
echo "Building new PocketBase image (if changes were made)..."
docker compose build pocketbase

echo "Restarting containers..."
docker compose up -d

echo "Cleaning up old Docker images..."
docker image prune -f

echo "=== Deploy Complete ==="
