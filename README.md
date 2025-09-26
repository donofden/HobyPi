# HobyPi
🛠️ HobyPi — A Raspberry Pi powered home-control stack with React, FastAPI, and Postgres.
# 🛠️ HobyPi

> A Raspberry Pi powered home-control stack with **React**, **FastAPI**, **PostgreSQL**, and **Docker**.  
> Built as a hobby project, evolving into a complete **home automation & control hub**.

---

## 🚀 Overview

**HobyPi** turns your Raspberry Pi into a full-stack server for experiments, learning, and home automation.  
It combines:

- ⚛️ **React** → Modern frontend UI  
- ⚡ **FastAPI** → High-performance backend APIs  
- 🐘 **PostgreSQL** → Relational database storage  
- 🐳 **Docker Compose** → Simple containerized deployment  

The goal:  
Start as a playground for coding hobbies → grow into a **home-control center** that manages IoT devices, sensors, and smart-home workflows.

---

## 📦 Project Structure

```
HobyPi/
├─ frontend/        # React (Vite) frontend
├─ backend/         # FastAPI backend
├─ docker-compose.yml
├─ .env.example     # Environment variables template
└─ LICENSE
```

---

## 🔧 Getting Started

### 1. Clone repo
```bash
git clone https://github.com/<your-username>/HobyPi.git
cd HobyPi
```

### 2. Configure environment
Copy `.env.example` → `.env` and set values:
```env
POSTGRES_USER=app
POSTGRES_PASSWORD=app_password
POSTGRES_DB=appdb
SECRET_KEY=super_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=postgresql+psycopg://app:app_password@db:5432/appdb
```

### 3. Run with Docker
```bash
docker compose up -d --build
```

### 4. Access services
- Frontend (React UI) → [http://localhost:80](http://localhost:80)  
- Backend API (FastAPI) → [http://localhost:8000/docs](http://localhost:8000/docs)  
- Postgres DB → Port **5432**  

---

## 🛡️ Authentication

- User login/signup with **JWT tokens**  
- Role-based access (admin / user)  
- Claims-based permissions (e.g., `users.read`, `users.write`)  
- `/api/auth/me` → Get current user info  

---

## 🗺️ Roadmap

- [x] Base stack: React + FastAPI + Postgres  
- [x] JWT Authentication with roles/claims  
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
