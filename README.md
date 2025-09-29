<p align="center">
  <img src="apps/react-ui/HobyPi.png" alt="HobyPi" width="256">
</p>

# HobyPi

> A Raspberry Pi powered home-control stack with **React** & **FastAPI**

> Built as a hobby project, evolving into a complete **home automation & control hub**.

## Current Designs & API

[HobyPi Design](docs/HobyPi.md)

[HobyPi API](docs/HobyPi-API.md)

---

## Overview

**HobyPi** turns your Raspberry Pi into a full-stack server for experiments, learning, and home automation.  
It combines:

- ⚛️ **React** → Modern frontend UI  
- ⚡ **FastAPI** → High-performance backend APIs  
- 🐘 **PostgreSQL** → Relational database storage  
- 🐳 **Docker Compose** → Simple containerized deployment  

The goal:  
Start as a playground for coding hobbies → grow into a **home-control center** that manages IoT devices, sensors, and smart-home workflows.

---

## Getting Started

### First-time Setup on a New Pi

### Clone repo
```bash
# 1) Clone to your home (~/hobypi)
git clone https://github.com/donofden/hobypi.git 

cd ~/hobypi

# 2) Make scripts executable
chmod +x scripts/* bin/*

# 3) Run bootstrap (installs deps + global commands)
./scripts/bootstrap.sh
# NOTE: Please reboot your Raspberry Pi after this step
sudo reboot

# 4) Prepare USB storage for PostgreSQL
# IMPORTANT: PostgreSQL requires external USB storage for better performance and reliability
# Follow the detailed guide: docs/PREPARE_USB_STORAGE.md

# 5) Run bootstrap scripts for components
./scripts/bootstrap-postgres.sh  # Configures PostgreSQL with USB storage
./scripts/bootstrap-fastapi.sh   # Sets up the FastAPI backend
./scripts/bootstrap-react-ui.sh  # Sets up the React frontend
```

`bootstrap.sh` will:
- Update & upgrade the system
- Install essentials (git, curl, vim, htop, bc, etc.)
- Install helper scripts globally (`check_temp`)

[USB Storage Preparation Script](docs/PREPARE_USB_STORAGE.md)

`bootstrap-postgres.sh` will install and configure PostgreSQL:

```
[HobyPi][PG] PostgreSQL is ready.
  Data dir     : /mnt/hobypi-data/pgdata
  Listen addr  : 0.0.0.0
  Port         : 5432
  Allowed CIDR : 192.168.1.0/24
  Role         : postgres
  Database     : hobypi

Local connect:
  PGPASSWORD='postgres' psql -h 127.0.0.1 -p 5432 -U postgres -d hobypi

From laptop on the same LAN:
  PGPASSWORD='postgres' psql -h 192.168.1.115 -p 5432 -U postgres -d hobypi -c 'SELECT 1;'
```

HobyPi uses a Makefile to simplify development tasks. Here are the main commands:

## Development Workflow

### Start Development Servers
```bash
# Start both React and FastAPI servers
make start

# Start individual components
make react-start  # Starts React on port 3000
make api-start    # Starts FastAPI on port 8000
```

### View Logs
```bash
make logs-react  # Watch React development server logs
make logs-api    # Watch FastAPI server logs
```

### Component Management
```bash
make status      # Check running services and their ports
make restart     # Restart both servers
make stop        # Stop all development servers

# Individual component restarts
make react-restart
make api-restart
```

### Setup and Maintenance
```bash
make setup-react  # Install/update React dependencies
make setup-api    # Create Python venv and install FastAPI deps
make clean-logs   # Remove old log files
make ensure-tools # Install system tools (psmisc, lsof)
```

You can customize ports using environment variables:
```bash
REACT_PORT=4000 
API_PORT=9000 
make start
```

## Making HobyPi Commands Available Everywhere

By default, the helper scripts (like `check_temp`) live in the `bin/` folder of this repo.  
To run them from **any directory**, add `HobyPi/bin` to your shell `PATH`.

### 1. Open your shell config
```bash
nano ~/.bashrc
```

### 2. Add this line at the end of the file
```bash
export PATH="$HOME/HobyPi/bin:$PATH"
```

### 3. Reload your shell
```bash
source ~/.bashrc
```

### 4. Test it
```bash
check_temp
```

If everything is set up correctly, you should see the Raspberry Pi’s temperature printed out.

---

## Configure environment
Copy `.env.example` → `.env` and set values:
```env
# FastAPI
APP_NAME=HobyPi API
APP_DEBUG=true

# JWT
JWT_SECRET=change-me-super-secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
JWT_ISSUER=hobypi
JWT_AUDIENCE=hobypi-clients

# DB (both point to same DB; async for app, sync for Alembic)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=hobypi

DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}
DATABASE_URL_SYNC=postgresql+psycopg://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Bootstrap admin (created/updated on API startup)
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_EMAIL=admin@local
BOOTSTRAP_ADMIN_NAME=ManOfAction
BOOTSTRAP_ADMIN_PASSWORD=letmein
```

## 🗺️ Roadmap

- [ ] Update Features with React + FastAPI + Postgres
- [ ] JWT Authentication with roles/claims  
- [ ] IoT device integration (sensors, switches)  
- [ ] Smart home dashboards
- [ ] Remote access with HTTPS + mobile app
- [ ] Automation rules (e.g., “turn on lights at sunset”)

---

## Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to fork this repo and open a PR.

---

## License

This project is licensed under the **MIT License** – see [LICENSE](LICENSE) file for details.

---

## Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/)  
- [React](https://react.dev/)  
- [PostgreSQL](https://www.postgresql.org/)  
- [Docker](https://www.docker.com/)  
- [Raspberry Pi](https://www.raspberrypi.com/) community ❤️

---
