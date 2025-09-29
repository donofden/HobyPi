<p align="center">
  <img src="apps/react-ui/HobyPi.png" alt="HobyPi" width="256">
</p>

# HobyPi

> A Raspberry Pi powered home-control stack with **React**, **FastAPI**, **PostgreSQL**, and **Docker**.  
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

## Project Structure

```
HobyPi/
├── apps
├── bin
│   ├── check_temp
│   ├── docker_clean
│   ├── health
│   ├── netinfo
│   ├── ports
│   ├── throttle_status
│   ├── top_procs
│   └── update_all
├── bootstrap.sh
├── LICENSE
├── README.md
└── services
```

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

# 4) Run bootstrap's (installs postgres, fastapi & react)
# NOTE: Check how to convert USB as a storage unit
./scripts/bootstrap-postgres.sh
./scripts/bootstrap-fastapi.sh
./scripts/bootstrap-react-ui.sh
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

## 🔧 Making HobyPi Commands Available Everywhere

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

- [ ] Base stack: React + FastAPI + Postgres  
- [ ] JWT Authentication with roles/claims  
- [ ] IoT device integration (sensors, switches)  
- [ ] Smart home dashboards  
- [ ] Remote access with HTTPS + mobile app  
- [ ] Automation rules (e.g., “turn on lights at sunset”)  

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to fork this repo and open a PR.

---

## 📜 License

This project is licensed under the **MIT License** – see [LICENSE](LICENSE) file for details.

---

## 🌟 Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/)  
- [React](https://react.dev/)  
- [PostgreSQL](https://www.postgresql.org/)  
- [Docker](https://www.docker.com/)  
- Raspberry Pi community ❤️

---
