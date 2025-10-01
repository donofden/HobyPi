<p align="center">
  <img src="apps/react-ui/HobyPi.png" alt="HobyPi" width="256">
</p>

# HobyPi

> A Raspberry Pi powered home-control stack with **React** & **FastAPI**

> Built as a hobby project, evolving into a complete **home automation & control hub**.

## Cur## 🗺️ Roadmap

- [x] **System Monitoring** - CPU temperature, system metrics, health checks
- [x] **JWT Authentication** - Secure token-based authentication with roles/claims
- [x] **User Management** - Complete user CRUD with role-based access control
- [x] **Database Integration** - PostgreSQL with async SQLAlchemy and migrations
- [ ] **React Integration** - Connect frontend with authentication system
- [ ] **IoT Device Integration** - sensors, switches, GPIO control
- [ ] **Smart Home Dashboards** - Real-time monitoring and control interfaces
- [ ] **Remote Access** - HTTPS setup with mobile app support
- [ ] **Automation Rules** - event-driven workflows (e.g., "turn on lights at sunset")
- [ ] **Camera System** - Live streaming and recording capabilities
- [ ] **Home Security** - Motion detection, alerts, and monitoringdware, UI & API

[HobyPi UI](docs/HobyPi.md)

[HobyPi API](docs/HobyPi-API.md)

[HobyPi Hardware Guide](https://github.com/donofden/HobyPi/wiki/HobyPi-Hardware-Guide)

---

## Overview

**HobyPi** turns your Raspberry Pi into a full-stack server for experiments, learning, and home automation.  
It combines:

- ⚛️ **React** → Modern frontend UI  
- ⚡ **FastAPI** → High-performance backend APIs with authentication & user management
- 🐘 **PostgreSQL** → Relational database storage  
- 🔐 **JWT Authentication** → Secure role-based access control
- 📊 **System Monitoring** → Real-time CPU, memory, and temperature monitoring
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

## Development Workflow

### Start Development Servers

HobyPi uses a Makefile to simplify development tasks. Here are the main commands:

```bash
# Start both React and FastAPI servers
make start

# Start individual components
make react-start  # Starts React on port 3000
make api-start    # Starts FastAPI on port 8000
```

### Database Management
```bash
make db-status    # Check PostgreSQL and database connection
make db-migrate   # Apply database migrations
make db-revision MSG="description"  # Create new migration
```

### API Testing
```bash
make test-api     # Test system monitoring endpoints
make test-auth    # Test authentication flow
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
make ensure-tools # Install system tools (psmisc, lsof, curl, jq)
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
# Application Settings
APP_NAME="HobyPi Enhanced API"
APP_DEBUG=true

# Database Configuration
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost/hobypi
DATABASE_URL_SYNC=postgresql://postgres:postgres@localhost/hobypi

# JWT Authentication
JWT_SECRET=change-me-super-secret-key-for-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
JWT_ISSUER=hobypi
JWT_AUDIENCE=hobypi-clients

# Bootstrap Admin User (created automatically on startup)
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_EMAIL=admin@local
BOOTSTRAP_ADMIN_NAME=HobyPi Administrator
BOOTSTRAP_ADMIN_PASSWORD=letmein

# Database Connection Variables
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=hobypi
```

## 🔌 API Endpoints

### System Monitoring (Public Access)
- `GET /` - API health check and version info
- `GET /system/health` - System health status
- `GET /system/temp` - CPU temperature and throttling status  
- `GET /system/metrics` - Comprehensive system metrics (CPU, memory, disk, network, top processes)

### Authentication
- `POST /auth/login` - Login with username/email and password (returns JWT token)
- `GET /auth/me` - Get current user profile (requires authentication)

### User Management (Requires Authentication)
- `GET /users` - List all users (requires `users:read` scope)
- `POST /users` - Create new user (requires `users:write` scope)

### Default Admin User
- **Username**: `admin`
- **Password**: `letmein`
- **Roles**: Admin (full access to all endpoints)

### Testing the API

```bash
# Test system endpoints (no authentication required)
curl http://localhost:8000/
curl http://localhost:8000/system/health
curl http://localhost:8000/system/temp
curl http://localhost:8000/system/metrics

# Login and get JWT token
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin", "password": "letmein"}'

# Use token for authenticated requests
TOKEN="your_jwt_token_here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/auth/me
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/users

# Create a new user
curl -X POST "http://localhost:8000/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "user@example.com", 
    "full_name": "New User",
    "password": "securepassword"
  }'
```

### Interactive API Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

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
