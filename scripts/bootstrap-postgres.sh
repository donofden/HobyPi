#!/usr/bin/env bash
# bootstrap-postgres.sh — PostgreSQL on Raspberry Pi (HobyPi)
# - Uses /mnt/<LABEL>/pgdata on your USB
# - LAN access enabled by default (listen 0.0.0.0, CIDR auto-detected /24)
# - Pass --local-only to bind to 127.0.0.1 only
# - Creates/updates a role & database (idempotent)
# - Runs health checks and prints ready-to-copy commands

set -Eeuo pipefail
trap 'rc=$?; echo "[HobyPi][PG][ERROR] failed at line $LINENO: $BASH_COMMAND (exit $rc)" >&2; exit $rc' ERR

# Defaults
LABEL="hobypi-data"
PORT="5432"
DB_USER="postgres"
DB_PASS="postgres"
DB_NAME="hobypi"
LISTEN_ADDR="0.0.0.0"    # LAN by default
ALLOW_CIDR=""            # auto-detect /24 from Pi IP unless provided
UFW_MODE="auto"          # auto / off
PI_IP_OVERRIDE=""

log() { echo "[HobyPi][PG] $*"; }
die() { echo "[HobyPi][PG][ERROR] $*" >&2; exit 1; }
require_root() { [[ $EUID -eq 0 ]] || die "Run with sudo."; }

primary_ip() {
  [[ -n "$PI_IP_OVERRIDE" ]] && { echo "$PI_IP_OVERRIDE"; return; }
  local ip
  ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  [[ -n "$ip" ]] || ip=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '/src/ {for(i=1;i<=NF;i++){if($i=="src"){print $(i+1); exit}}}')
  echo "$ip"
}

auto_cidr_from_ip() {
  local ip="$1"
  if [[ "$ip" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)\.[0-9]+$ ]]; then
    echo "${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.${BASH_REMATCH[3]}.0/24"
  else
    echo "192.168.1.0/24"
  fi
}

ensure_mount_present() {
  MNT="/mnt/${LABEL}"; export MNT
  PGDATA="${MNT}/pgdata"; export PGDATA
  log "Checking mountpoint at ${MNT} ..."
  mkdir -p "$MNT"
  if ! mountpoint -q "$MNT"; then mount "$MNT" || true; fi
  mountpoint -q "$MNT" || die "Mountpoint $MNT is not mounted."
}

install_postgres() {
  log "Installing PostgreSQL ..."
  apt update -y
  apt install -y postgresql postgresql-contrib postgresql-common
}

detect_pg_version() {
  [[ -d /etc/postgresql ]] || die "PostgreSQL not installed correctly."
  PG_VERSION="$(ls /etc/postgresql | sort -V | tail -n1)"
  [[ -n "$PG_VERSION" ]] || die "Could not detect PostgreSQL version."
  POSTGRES_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
  PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
  export PG_VERSION POSTGRES_CONF PG_HBA
  log "Detected PostgreSQL ${PG_VERSION}"
}

init_or_attach_cluster() {
  PGDATA="/mnt/${LABEL}/pgdata"
  export PGDATA

  if [[ -d "${PGDATA}/base" ]]; then
    log "Existing data dir at ${PGDATA}, attaching ..."
    chown -R postgres:postgres "${PGDATA}"
    chmod 700 "${PGDATA}"

    esc_pgdata="$(printf '%s' "${PGDATA}" | sed 's/[\/&]/\\&/g')"
    sed -i -e "s|^#\?data_directory *=.*|data_directory = '${esc_pgdata}'|" "${POSTGRES_CONF}"
    return
  fi

  if command -v pg_lsclusters >/dev/null 2>&1; then
    if pg_lsclusters | grep -q " ${PG_VERSION} .* main .* online"; then
      systemctl stop "postgresql@${PG_VERSION}-main" || systemctl stop postgresql || true
    fi
  fi

  mkdir -p "${PGDATA}"
  chown -R postgres:postgres "${PGDATA}"
  chmod 700 "${PGDATA}"

  pg_dropcluster --stop "${PG_VERSION}" main || true
  pg_createcluster --datadir="${PGDATA}" "${PG_VERSION}" main
}

configure_networking() {
  if [[ -z "${ALLOW_CIDR}" ]]; then
    local ip; ip="$(primary_ip)"
    ALLOW_CIDR="$(auto_cidr_from_ip "$ip")"
    log "Auto CIDR: ${ALLOW_CIDR} (from IP ${ip})"
  fi
  log "Configuring postgresql.conf (listen=${LISTEN_ADDR} port=${PORT}) ..."
  sed -i "s/^#*listen_addresses = .*/listen_addresses = '${LISTEN_ADDR}'/" "${POSTGRES_CONF}"
  sed -i "s/^#*port = .*/port = ${PORT}/" "${POSTGRES_CONF}"

  log "Configuring pg_hba.conf ..."
  grep -qE '^local\s+all\s+all\s+peer' "${PG_HBA}" || echo "local   all             all                                     peer" >> "${PG_HBA}"
  grep -qE '^host\s+all\s+all\s+127\.0\.0\.1/32\s+scram-sha-256' "${PG_HBA}" || echo "host    all             all             127.0.0.1/32            scram-sha-256" >> "${PG_HBA}"
  if [[ "${ALLOW_CIDR}" != "127.0.0.1/32" ]]; then
    grep -qE "^host\s+all\s+all\s+${ALLOW_CIDR//\./\.}\s+scram-sha-256" "${PG_HBA}" || echo "host    all             all             ${ALLOW_CIDR}            scram-sha-256" >> "${PG_HBA}"
  fi
}

maybe_configure_ufw() {
  if [[ "${UFW_MODE}" == "off" ]]; then log "UFW: disabled"; return; fi
  if ! command -v ufw >/dev/null 2>&1; then log "UFW not installed; skipping"; return; fi
  if [[ "${ALLOW_CIDR}" == "127.0.0.1/32" ]]; then log "Local-only; no UFW rule"; return; fi
  log "UFW allow from ${ALLOW_CIDR} to port ${PORT}/tcp"
  ufw allow from "${ALLOW_CIDR}" to any port "${PORT}" proto tcp || true
  ufw status || true
}

restart_enable_service() {
  log "Restarting PostgreSQL ..."
  systemctl enable postgresql
  systemctl restart postgresql
  sleep 2
  systemctl --no-pager status postgresql || true
}

create_role_and_db() {
  log "Ensuring role '${DB_USER}' ..."
  if ! sudo -u postgres psql -Atqc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE \"${DB_USER}\" LOGIN PASSWORD '${DB_PASS}';"
  fi
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER ROLE \"${DB_USER}\" PASSWORD '${DB_PASS}';"

  log "Ensuring database '${DB_NAME}' owned by '${DB_USER}' ..."
  if ! sudo -u postgres psql -Atqc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\";"
  fi
}

health_checks() {
  log "Health checks ..."
  ss -ltnp | grep -q ":${PORT} " && log "Socket: PASS" || log "Socket: FAIL"
  sudo -u postgres psql -Atqc "SELECT 1;" >/dev/null 2>&1 && log "psql (postgres): PASS" || log "psql (postgres): FAIL"
  PGPASSWORD="${DB_PASS}" psql -h 127.0.0.1 -p "${PORT}" -U "${DB_USER}" -d "${DB_NAME}" -Atqc "SELECT 1;" >/dev/null 2>&1     && log "psql (${DB_USER}@${DB_NAME}): PASS" || log "psql (${DB_USER}@${DB_NAME}): FAIL"
}

print_summary() {
  local PI_IP; PI_IP="$(primary_ip)"
  echo
  log "PostgreSQL is ready."
  echo "  Data dir     : ${PGDATA}"
  echo "  Listen addr  : ${LISTEN_ADDR}"
  echo "  Port         : ${PORT}"
  echo "  Allowed CIDR : ${ALLOW_CIDR}"
  echo "  Role         : ${DB_USER}"
  echo "  Database     : ${DB_NAME}"
  echo
  echo "Local connect:"
  echo "  PGPASSWORD='${DB_PASS}' psql -h 127.0.0.1 -p ${PORT} -U ${DB_USER} -d ${DB_NAME}"
  if [[ "${ALLOW_CIDR}" != "127.0.0.1/32" ]]; then
    echo
    echo "From laptop on the same LAN:"
    echo "  PGPASSWORD='${DB_PASS}' psql -h ${PI_IP} -p ${PORT} -U ${DB_USER} -d ${DB_NAME} -c 'SELECT 1;'"
  fi
}

main() {
  require_root
  ensure_mount_present
  install_postgres
  detect_pg_version
  init_or_attach_cluster
  configure_networking
  maybe_configure_ufw
  restart_enable_service
  create_role_and_db
  health_checks
  print_summary
}

main "$@"
