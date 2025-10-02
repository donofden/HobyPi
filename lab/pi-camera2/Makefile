SHELL := /bin/bash
PYTHON ?= python3
VENV ?= .venv
PIP := $(VENV)/bin/pip
PY := $(VENV)/bin/python
HOST ?= 0.0.0.0
PORT ?= 8001

.PHONY: help install-system-deps deps run reload free-camera resume-desktop lint clean

help:
	@echo "Available targets:"
	@echo "  make install-system-deps  # Install camera stack packages via apt"
	@echo "  make deps                 # Create virtualenv and install Python deps"
	@echo "  make run                  # Launch FastAPI server"
	@echo "  make reload               # Launch server with autoreload"
	@echo "  make free-camera          # Stop services that hold the camera"
	@echo "  make resume-desktop       # Restart PipeWire stack"
	@echo "  make lint                 # Basic sanity check"
	@echo "  make clean                # Remove caches and virtualenv"

install-system-deps:
	./scripts/install_system_deps.sh

$(VENV)/bin/python:
	$(PYTHON) -m venv $(VENV)

deps: $(VENV)/bin/python
	$(PIP) install -U pip wheel
	$(PIP) install -r requirements.txt

run: deps
	$(PY) -m uvicorn main:app --host $(HOST) --port $(PORT)

reload: deps
	PI_CAMERA_RELOAD=1 ./scripts/run_server.sh

free-camera: deps
	$(PY) main.py free-camera

resume-desktop: deps
	$(PY) main.py resume-desktop

lint: deps
	$(PY) -m compileall app

clean:
	rm -rf $(VENV)
	find . -name '__pycache__' -type d -prune -exec rm -rf {} +
