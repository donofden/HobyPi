# USB Storage Preparation Script

This repo includes a utility script to prepare or adopt USB drives for **HobyPi** projects on Raspberry Pi.  

The script (`scripts/prepare_usb_storage.sh`) standardizes USB usage by:

- Creating a **consistent mountpoint** (e.g., `/mnt/hobypi-data`)  
- Using **LABEL-based automount** (`hobypi-data` by default) so any stick with that label mounts the same everywhere  
- Leveraging **systemd automount** so drives mount on first access and don’t block boot if missing  
- Backing up `/etc/fstab` each run  

---

## Modes

### 1. Full (Destructive)

Creates a new clean USB drive.  
- Wipes the entire device (**all data lost**)  
- Creates a single **ext4** partition  
- Labels it (`hobypi-data` by default)  
- Adds an `/etc/fstab` entry for automount  
- Mounts it and fixes ownership for your user  

```bash
sudo ./scripts/prepare_usb_storage.sh --full /dev/sdX [LABEL] [-y]
```

Example:  
```bash
# ⚠️ This will ERASE /dev/sda and create an ext4 partition labeled hobypi-data
sudo ./scripts/prepare_usb_storage.sh --full /dev/sda hobypi-data -y
```

---

### 2. Adopt (Non-Destructive)

Reuses an existing partition without wiping.  
- Accepts `/dev/sdX1` (a partition)  
- Tries to apply the chosen label (`hobypi-data` default)  
- If relabeling isn’t possible, falls back to **UUID** in fstab  
- Updates `/etc/fstab` for automount at `/mnt/<label>`  

```bash
sudo ./scripts/prepare_usb_storage.sh --adopt /dev/sdX1 [LABEL]
```

Example:  
```bash
# Reuse /dev/sda1, label it hobypi-data if possible, otherwise mount by UUID
sudo ./scripts/prepare_usb_storage.sh --adopt /dev/sda1 hobypi-data
```

---

## ⚙️ How it Works

- **Mountpoint** → created at `/mnt/<label>`  
- **fstab entry** → added as:  
  ```
  LABEL=hobypi-data  /mnt/hobypi-data  ext4  defaults,noatime,x-systemd.automount,noauto,nofail  0  2
  ```
- **fstab backup** → saved to `/etc/fstab.YYYYMMDD-HHMMSS.bak`  
- **Ownership** → changed to your user for easy access  

---

## Safety Notes

- For `--full`, always pass the **whole device** (e.g., `/dev/sda`).  
- For `--adopt`, pass a **partition** (e.g., `/dev/sda1`).  
- The script refuses to touch `/dev/mmcblk0` (your Pi’s system SD card).  
- Confirm the device path with `lsblk -f` before running.  
- Each run creates a backup of `/etc/fstab`.  

---

## Requirements

Install filesystem tools (for labeling support in adopt mode):  

```bash
sudo apt update
sudo apt install -y e2fsprogs dosfstools ntfs-3g exfatprogs
```

---

## Use Cases

- **SQLite/Flat files**: put `.db` or configs under `/mnt/hobypi-data/`  
- **Postgres**:  
  ```bash
  sudo mkdir -p /mnt/hobypi-data/pgdata
  sudo chown -R postgres:postgres /mnt/hobypi-data/pgdata
  # set PGDATA to /mnt/hobypi-data/pgdata
  ```
- **Docker bind mounts**:  
  ```yaml
  volumes:
    - /mnt/hobypi-data/pgdata:/var/lib/postgresql/data
  ```

---

## Verify

Check if mounted:  

```bash
lsblk -f
df -h /mnt/hobypi-data
```

Unmount safely before unplugging:  

```bash
sudo umount /mnt/hobypi-data
```
