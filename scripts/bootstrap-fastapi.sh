#!/usr/bin/env bash
# bootstrap-fastapi.sh
# Enhanced installer for FastAPI with authentication, database, and system monitoring

set -euo pipefail

echo "=== HobyPi FastAPI Enhanced Bootstrap ==="

# Check for .env file
if [[ ! -f "$HOME/HobyPi/.env" ]]; then
    echo "⚠️  No .env file found. Creating from example..."
    cp "$HOME/HobyPi/.env.example" "$HOME/HobyPi/.env"
    echo "✅ Created .env file from .env.example"
    echo "💡 Edit $HOME/HobyPi/.env to customize your configuration"
fi

echo "=== Updating system ==="
sudo apt update && sudo apt upgrade -y

echo "=== Installing Python & build dependencies ==="
sudo apt install -y python3 python3-venv python3-pip build-essential

echo "=== Installing system tools ==="
sudo apt install -y curl jq htop psmisc lsof

APP_DIR="$HOME/HobyPi/apps/fastapi-app"
cd "$APP_DIR" || { echo "❌ fastapi-app folder not found at $APP_DIR"; exit 1; }

echo "=== Creating/activating Python virtual environment ==="
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

echo "=== Upgrading pip & installing enhanced requirements ==="
python -m pip install --upgrade pip

# Install requirements
if [[ -f requirements.txt ]]; then
  pip install -r requirements.txt
else
  echo "⚠️  No requirements.txt found - installing basic dependencies"
  pip install fastapi uvicorn psutil pydantic-settings
fi

echo "=== Setting up environment configuration ==="
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "✅ Environment file created from local .env.example"
  elif [[ -f ../../.env.example ]]; then
    cp ../../.env.example .env
    echo "✅ Environment file created from root .env.example"
  else
    echo "⚠️  No .env.example found, creating basic .env file"
    cat > .env << 'ENV_END'
# Basic configuration
APP_NAME="HobyPi Enhanced API"
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost/hobypi
DATABASE_URL_SYNC=postgresql://postgres:postgres@localhost/hobypi
JWT_SECRET=change-me-in-production
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=letmein
ENV_END
  fi
fi

echo "=== Checking database connectivity ==="
if command -v psql >/dev/null 2>&1; then
  if PGPASSWORD=postgres psql -h localhost -U postgres -d hobypi -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database connection successful"
    
    # Run migrations if available
    if [[ -f alembic.ini ]]; then
      echo "=== Running database migrations ==="
      alembic upgrade head || echo "⚠️  Migration failed - will retry on API startup"
    fi
  else
    echo "⚠️  Database connection failed - migrations will run on API startup"
  fi
else
  echo "ℹ️  psql not found - skipping database check"
fi

echo ""
echo "✅ FastAPI Enhanced Bootstrap Complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Ensure PostgreSQL is running:"
echo "   systemctl status postgresql"
echo ""
echo "2. Start the API:"
echo "   cd $APP_DIR && source .venv/bin/activate"
echo "   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "   Or from root directory: make api-start"
echo ""
echo "3. Test the API:"
echo "   make test-api     # Test system endpoints"
echo "   make test-auth    # Test authentication"
echo ""
echo "4. Access documentation:"
echo "   http://localhost:8000/docs"
echo ""
echo "5. Default user accounts:"
echo "   Admin User:"
echo "     Username: admin"
echo "     Password: letmein"
echo "     Scopes: admin system:read users:read users:write"
echo ""
echo "   Viewer User:"
echo "     Username: viewer"
echo "     Password: viewpass"
echo "     Scopes: system:read users:read"

# Optional: start immediately if you pass --start
if [[ "${1:-}" == "--start" ]]; then
  echo ""
  echo "🚀 Starting API server..."
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi
