#!/bin/bash
# bootstrap-react-ui.sh
# One-click installer & starter for React UI on Raspberry Pi

set -e

echo "=== Updating system ==="
sudo apt update && sudo apt upgrade -y

echo "=== Installing Node.js & npm ==="
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs build-essential

echo "=== Checking Node.js & npm ==="
node -v
npm -v

echo "=== Installing React UI dependencies ==="
cd ~/HobyPi/apps/react-ui || { echo "react-ui folder not found"; exit 1; }
npm install

# echo "=== Starting React UI ==="
# npm start
