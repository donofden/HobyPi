SHELL := /bin/bash
PYTHON ?= python3
VENV ?= .venv
PIP := $(VENV)/bin/pip
PIP_ENV := PYTHONWARNINGS=ignore PIP_DISABLE_PIP_VERSION_CHECK=1
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
	$(PYTHON) -m venv --system-site-packages $(VENV)

deps: $(VENV)/bin/python
	-$(PIP_ENV) $(PIP) uninstall -y send2trash >/dev/null 2>&1 || true
	$(PIP_ENV) $(PIP) install -U pip wheel
	$(PIP_ENV) $(PIP) install --break-system-packages send2trash==1.8.3
	$(PIP_ENV) $(PIP) install -r requirements.txt

run: deps
	-@pids=$$(lsof -ti tcp:$(PORT) 2>/dev/null); \
	if [ -n "$$pids" ]; then \
		echo "Reclaiming port $(PORT) (pids: $$pids)"; \
		kill $$pids || true; \
		sleep 1; \
	fi
	$(PY) main.py serve --host $(HOST) --port $(PORT)

reload: deps
	PI_CAMERA_RELOAD=1 $(PY) main.py serve --host $(HOST) --port $(PORT) --reload

free-camera: deps
	$(PY) main.py free-camera

resume-desktop: deps
	$(PY) main.py resume-desktop

lint: deps
	$(PY) -m compileall app

clean:
	rm -rf $(VENV)
	find . -name '__pycache__' -type d -prune -exec rm -rf {} +
