#!/usr/bin/env bash
# bootstrap-fastapi.sh
# One-click installer & runner for FastAPI on Raspberry Pi

set -euo pipefail

echo "=== Updating system ==="
sudo apt update && sudo apt upgrade -y

echo "=== Installing Python & build deps ==="
sudo apt install -y python3 python3-venv python3-pip build-essential

APP_DIR="$HOME/HobyPi/apps/fastapi-app"
cd "$APP_DIR" || { echo "fastapi-app folder not found at $APP_DIR"; exit 1; }

echo "=== Creating/activating venv ==="
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

echo "=== Upgrading pip & installing requirements ==="
python -m pip install --upgrade pip

# If requirements.txt doesn’t exist, create a minimal one
if [[ ! -f requirements.txt ]]; then
  cat > requirements.txt <<'EOF'
fastapi==0.115.2
uvicorn[standard]==0.30.6
EOF
fi

pip install -r requirements.txt

echo "=== FastAPI bootstrap complete ==="
echo "Run the API with:"
echo "  $APP_DIR/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000"

# Optional: start immediately if you pass --start
if [[ "${1:-}" == "--start" ]]; then
  exec "$APP_DIR/.venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 --reload
fi
