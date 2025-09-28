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
git clone https://github.com/<you>/hobypi.git ~/hobypi
cd ~/hobypi

# 2) Make scripts executable
chmod +x bootstrap.sh bootstrap-react-ui.sh bootstrap-fastapi.sh bin/*

# 3) Run bootstrap (installs deps + global commands)
./bootstrap.sh
```
This will:
- Update & upgrade the system  
- Install essentials (git, curl, vim, htop, bc, etc.)  
- Install helper scripts globally (`check_temp`)

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
POSTGRES_USER=app
POSTGRES_PASSWORD=app_password
POSTGRES_DB=appdb
SECRET_KEY=super_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=postgresql+psycopg://app:app_password@db:5432/appdb
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
