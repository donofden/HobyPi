#!/usr/bin/env bash
set -euo pipefail

echo "[HobyPi] Updating system..."
sudo apt update && sudo apt upgrade -y

echo "[HobyPi] Installing essentials..."
sudo apt install -y git curl vim htop bc build-essential python3-pip python3-venv

echo "[HobyPi] Done. It's recommended to reboot now."
