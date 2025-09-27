# ===== HobyPi Makefile (process-group safe) =====
# Dev runner for React (Vite dev) and FastAPI (Uvicorn)
# Logs  -> ~/HobyPi/logs/*.log
# PIDGs -> ~/HobyPi/.pids/*.pgid

.DEFAULT_GOAL := help

ROOT        ?= $(HOME)/HobyPi
REACT_DIR   ?= $(ROOT)/apps/react-ui
FASTAPI_DIR ?= $(ROOT)/apps/fastapi-app
LOG_DIR     ?= $(ROOT)/logs
PID_DIR     ?= $(ROOT)/.pids

REACT_PORT  ?= 3000
API_PORT    ?= 8000

# ---- helper: free a port if something is listening (uses fuser if available) ----
# usage: $(call free_port,3000)
define free_port
	if ss -ltnp 2>/dev/null | awk -v p="$(1)" 'match($$4,":"p"$$"){exit 0} END{exit 1}'; then \
		echo "[free] port $(1) busy -> killing listener(s)"; \
		if command -v fuser >/dev/null 2>&1; then \
			fuser -k -TERM $(1)/tcp 2>/dev/null || true; sleep 1; \
			fuser -k -KILL $(1)/tcp 2>/dev/null || true; \
		else \
			for p in `ss -ltnp 2>/dev/null | awk -v p="$(1)" 'match($$4,":"p"$$"){if (match($$0,/pid=([0-9]+)/,m)) print m[1]}'`; do kill -TERM $$p 2>/dev/null || true; done; \
			sleep 1; \
			for p in `ss -ltnp 2>/dev/null | awk -v p="$(1)" 'match($$4,":"p"$$"){if (match($$0,/pid=([0-9]+)/,m)) print m[1]}'`; do kill -KILL $$p 2>/dev/null || true; done; \
		fi; \
	fi
endef

.PHONY: help init setup-react setup-api \
        react-start api-start react-stop api-stop \
        start stop restart status logs-react logs-api \
        kill-react-port kill-api-port kill-ports kill-port kill--port killport \
        react-restart api-restart clean-pids clean-logs ensure-tools

help:
	@echo "HobyPi dev commands:"
	@echo "  make start              # start React (port $(REACT_PORT)) + FastAPI (port $(API_PORT)) in background"
	@echo "  make stop               # stop both (kill process groups; fallback kill-by-port)"
	@echo "  make restart            # restart both"
	@echo "  make status             # show listening ports + PGID files"
	@echo "  make logs-react         # tail React dev log"
	@echo "  make logs-api           # tail FastAPI log"
	@echo "  make setup-react        # npm install in $(REACT_DIR)"
	@echo "  make setup-api          # create venv + install deps in $(FASTAPI_DIR)"
	@echo "  make react-restart      # restart React only"
	@echo "  make api-restart        # restart FastAPI only"
	@echo "  make kill-react-port    # forcibly free port $(REACT_PORT)"
	@echo "  make kill-api-port      # forcibly free port $(API_PORT)"
	@echo "  make kill-ports         # free both ports"
	@echo "  make kill-port PORT=#####  # free an arbitrary port"
	@echo "  make ensure-tools       # install helpers (psmisc, lsof)"
	@echo "  make clean-pids         # remove stale PIDG files"
	@echo "  make clean-logs         # remove old logs"
	@echo "Overrides: REACT_PORT=4000 API_PORT=9000"

init:
	@mkdir -p "$(LOG_DIR)" "$(PID_DIR)"

setup-react:
	@command -v npm >/dev/null 2>&1 || { echo "npm not found; install Node.js"; exit 1; }
	@echo "[react] npm install in $(REACT_DIR)"
	@cd "$(REACT_DIR)" && npm install

setup-api:
	@echo "[api] ensure venv + deps in $(FASTAPI_DIR)"
	@cd "$(FASTAPI_DIR)" && { [ -d .venv ] || python3 -m venv .venv; . .venv/bin/activate; python -m pip install --upgrade pip; [ -f requirements.txt ] || printf "fastapi==0.115.2\nuvicorn[standard]==0.30.6\n" > requirements.txt; pip install -r requirements.txt; }

# --- START (use setsid so each runs in its own process group) ---
react-start: init setup-react
	@$(call free_port,$(REACT_PORT))
	@echo "[react] starting dev server on :$(REACT_PORT)"
	@cd "$(REACT_DIR)" && setsid sh -c "exec npm run dev -- --host --port $(REACT_PORT) --strictPort" >"$(LOG_DIR)/react-dev.log" 2>&1 & echo $$! >"$(PID_DIR)/react.pgid"
	@echo "[react] log: $(LOG_DIR)/react-dev.log  pgid: $(PID_DIR)/react.pgid"

api-start: init setup-api
	@$(call free_port,$(API_PORT))
	@echo "[api] starting FastAPI on :$(API_PORT)"
	@cd "$(FASTAPI_DIR)" && setsid sh -c "exec ./\.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $(API_PORT)" >"$(LOG_DIR)/fastapi.log" 2>&1 & echo $$! >"$(PID_DIR)/fastapi.pgid"
	@echo "[api] log: $(LOG_DIR)/fastapi.log  pgid: $(PID_DIR)/fastapi.pgid"

# --- STOP (kill the whole group; then verify/kill-by-port if needed) ---
react-stop:
	@echo "[react] stopping"
	@if [ -f "$(PID_DIR)/react.pgid" ]; then \
		PGID=`tr -cd '0-9' <"$(PID_DIR)/react.pgid"`; \
		if [ -n "$$PGID" ]; then \
			kill -TERM -$$PGID 2>/dev/null || true; sleep 1; \
			kill -KILL -$$PGID 2>/dev/null || true; \
			echo "[react] killed PGID $$PGID"; \
		fi; \
		rm -f "$(PID_DIR)/react.pgid"; \
	fi; \
	if ss -ltnp 2>/dev/null | awk -v p="$(REACT_PORT)" 'match($$4,":"p"$$"){exit 0} END{exit 1}'; then \
		if command -v fuser >/dev/null 2>&1; then \
			echo "[react] port $(REACT_PORT) still open -> fuser kill"; \
			fuser -k -TERM $(REACT_PORT)/tcp 2>/dev/null || true; sleep 1; \
			fuser -k -KILL $(REACT_PORT)/tcp 2>/dev/null || true; \
		else \
			echo "[react] port $(REACT_PORT) still open -> ss+kill"; \
			for p in `ss -ltnp 2>/dev/null | awk -v p="$(REACT_PORT)" 'match($$4,":"p"$$"){if (match($$0,/pid=([0-9]+)/,m)) print m[1]}'`; do kill -TERM $$p 2>/dev/null || true; done; \
			sleep 1; \
			for p in `ss -ltnp 2>/dev/null | awk -v p="$(REACT_PORT)" 'match($$4,":"p"$$"){if (match($$0,/pid=([0-9]+)/,m)) print m[1]}'`; do kill -KILL $$p 2>/dev/null || true; done; \
		fi; \
	fi; \
	echo "[react] stopped"

api-stop:
	@echo "[api] stopping"
	@if [ -f "$(PID_DIR)/fastapi.pgid" ]; then \
		PGID=`tr -cd '0-9' <"$(PID_DIR)/fastapi.pgid"`; \
		if [ -n "$$PGID" ]; then \
			kill -TERM -$$PGID 2>/dev/null || true; sleep 1; \
			kill -KILL -$$PGID 2>/dev/null || true; \
			echo "[api] killed PGID $$PGID"; \
		fi; \
		rm -f "$(PID_DIR)/fastapi.pgid"; \
	fi; \
	if ss -ltnp 2>/dev/null | awk -v p="$(API_PORT)" 'match($$4,":"p"$$"){exit 0} END{exit 1}'; then \
		if command -v fuser >/dev/null 2>&1; then \
			echo "[api] port $(API_PORT) still open -> fuser kill"; \
			fuser -k -TERM $(API_PORT)/tcp 2>/dev/null || true; sleep 1; \
			fuser -k -KILL $(API_PORT)/tcp 2>/dev/null || true; \
		else \
			echo "[api] port $(API_PORT) still open -> ss+kill"; \
			for p in `ss -ltnp 2>/dev/null | awk -v p="$(API_PORT)" 'match($$4,":"p"$$"){if (match($$0,/pid=([0-9]+)/,m)) print m[1]}'`; do kill -TERM $$p 2>/dev/null || true; done; \
			sleep 1; \
			for p in `ss -ltnp 2>/dev/null | awk -v p="$(API_PORT)" 'match($$4,":"p"$$"){if (match($$0,/pid=([0-9]+)/,m)) print m[1]}'`; do kill -KILL $$p 2>/dev/null || true; done; \
		fi; \
	fi; \
	echo "[api] stopped"

start: react-start api-start
	@echo "[urls] React: http://`hostname -I | awk '{print $$1}'`:$(REACT_PORT)"
	@echo "[urls] API  : http://`hostname -I | awk '{print $$1}'`:$(API_PORT)"

stop: react-stop api-stop
	@echo "[dev] stopped both"

restart: stop start
react-restart: react-stop react-start
api-restart: api-stop api-start

status:
	@echo "== Ports =="; ss -ltnp | awk -v rp="$(REACT_PORT)" -v ap="$(API_PORT)" 'match($$4,":"rp"$$") || match($$4,":"ap"$$") {print}'
	@echo "== PIDGs =="; [ -f "$(PID_DIR)/react.pgid" ] && echo "$(PID_DIR)/react.pgid -> `cat $(PID_DIR)/react.pgid`" || echo "$(PID_DIR)/react.pgid -> (none)"; [ -f "$(PID_DIR)/fastapi.pgid" ] && echo "$(PID_DIR)/fastapi.pgid -> `cat $(PID_DIR)/fastapi.pgid`" || echo "$(PID_DIR)/fastapi.pgid -> (none)"

logs-react:
	@tail -n 200 -f "$(LOG_DIR)/react-dev.log"

logs-api:
	@tail -n 200 -f "$(LOG_DIR)/fastapi.log"

# ---- convenience: kill ports quickly ----
kill-react-port:
	@$(call free_port,$(REACT_PORT))

kill-api-port:
	@$(call free_port,$(API_PORT))

kill-ports: kill-react-port kill-api-port
	kill_ports

kill-port:
	@test -n "$(PORT)" || { echo "Usage: make kill-port PORT=<number>"; exit 1; }
	@$(call free_port,$(PORT))

# Aliases so common typos still work
kill--port:
	@$(MAKE) kill-port PORT=$(PORT)

killport:
	@$(MAKE) kill-port PORT=$(PORT)

# Cleanup helpers (optional)
clean-pids:
	@rm -f "$(PID_DIR)/react.pgid" "$(PID_DIR)/fastapi.pgid" 2>/dev/null || true
	@echo "[clean] removed PIDG files (if any)"

clean-logs:
	@rm -f "$(LOG_DIR)/react-dev.log" "$(LOG_DIR)/fastapi.log" 2>/dev/null || true
	@echo "[clean] removed logs (if any)"

ensure-tools:
	@sudo apt update -y && sudo apt install -y psmisc lsof
	@echo "[tools] installed psmisc (fuser) and lsof"
