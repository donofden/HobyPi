# PostgreSQL Bootstrap (Raspberry Pi)

This project includes a helper script to install and configure **PostgreSQL** on your Raspberry Pi, using an external USB drive for data storage.

## 1. Script location
```
scripts/bootstrap-postgres.sh
```

## 2. What it does
- Installs PostgreSQL (latest available in apt)
- Moves the data directory to `/mnt/<LABEL>/pgdata` (default: `hobypi-data`)
- Configures `postgresql.conf` and `pg_hba.conf`
- Enables LAN access by default (`listen_addresses = 0.0.0.0`, auto `/24` CIDR)
- Secures access with **scram-sha-256**
- Creates/updates a role and database you specify
- Configures **systemd** so PostgreSQL **auto-starts on boot**
- Runs health checks and prints ready-to-copy connection commands

## 3. Usage

### First make it executable
```bash
cd scripts
chmod +x bootstrap-postgres.sh
```

### Run with your settings
```bash
sudo ./bootstrap-postgres.sh   --db-user hobypi   --db-pass 'secret123'   --db-name hobypi   --pi-ip 192.168.1.115
```

- `--db-user` → the database role you want created  
- `--db-pass` → password for that role  
- `--db-name` → database to create (owned by that role)  
- `--pi-ip`   → your Pi’s LAN IP (for the printed laptop connection command)  

### Local-only (no LAN access)
```bash
sudo ./bootstrap-postgres.sh --local-only   --db-user hobypi   --db-pass 'secret123'   --db-name hobypi
```

## 4. Verify installation
Check service:
```bash
systemctl status postgresql
```

Run quick health test (on Pi):
```bash
PGPASSWORD='secret123' psql -h 127.0.0.1 -p 5432 -U hobypi -d hobypi -c "SELECT 1;"
```

From your laptop on same LAN:
```bash
PGPASSWORD='secret123' psql -h 192.168.1.115 -p 5432 -U hobypi -d hobypi -c "SELECT 1;"
```

## 5. Auto-start
No manual steps needed.  
The script runs:
```bash
systemctl enable postgresql
```
So PostgreSQL will **start automatically on every boot**.  

You can still control it manually:
```bash
sudo systemctl stop postgresql
sudo systemctl start postgresql
sudo systemctl restart postgresql
```
