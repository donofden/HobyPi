#!/usr/bin/env bash
set -euo pipefail

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required to install system dependencies" >&2
  exit 1
fi

echo "Updating apt repositories..."
sudo apt update

echo "Installing camera stack packages..."
sudo apt install -y \
  python3-picamera2 \
  python3-libcamera \
  libcamera-apps-lite \
  v4l-utils \
  lsof

echo "All system dependencies installed. Reboot may be required for camera stack updates."
