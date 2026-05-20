#!/bin/bash
set -e

echo "=== GreenRoute VPS Setup Script ==="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo ./setup.sh)"
  exit 1
fi

echo "[1/4] Installing Docker and Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable --now docker
else
    echo "Docker is already installed."
fi

echo "[2/4] Setting up directories..."
mkdir -p ../pocketbase/pb_data
mkdir -p ../pocketbase/pb_public
chmod 755 ../pocketbase/pb_data

echo "[3/4] Building and starting services..."
docker compose up -d --build

echo "=== Setup Complete! ==="
echo "Please edit vps-scripts/Caddyfile to set your actual domain,"
echo "then run: docker compose restart caddy"
