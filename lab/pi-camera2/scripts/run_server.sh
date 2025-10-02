#!/usr/bin/env bash
set -euo pipefail
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)
cd "$DIR"

HOST=${PI_CAMERA_HOST:-0.0.0.0}
PORT=${PI_CAMERA_PORT:-8001}
EXTRA_ARGS=()
if [[ ${PI_CAMERA_RELOAD:-0} == 1 ]]; then
  EXTRA_ARGS+=("--reload")
fi

PYTHON_BIN="${PI_CAMERA_PYTHON:-}"
if [[ -z "$PYTHON_BIN" ]]; then
  if [[ -x .venv/bin/python ]]; then
    PYTHON_BIN=.venv/bin/python
  else
    PYTHON_BIN=${PYTHON:-python3}
  fi
fi

if [[ ${#EXTRA_ARGS[@]} -gt 0 ]]; then
  "$PYTHON_BIN" main.py serve --host "$HOST" --port "$PORT" "${EXTRA_ARGS[@]}"
else
  "$PYTHON_BIN" main.py serve --host "$HOST" --port "$PORT"
fi
