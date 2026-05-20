#!/bin/bash
set -e

echo "=== Updating Source Code ==="
cd ..
git pull origin main

echo "=== Triggering Deploy ==="
cd vps-scripts
./deploy.sh
