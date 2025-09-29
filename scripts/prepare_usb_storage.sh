#!/usr/bin/env bash
# ==============================================================================
# prepare_usb_storage.sh
#
# Purpose:
#   Standardize a USB drive for HobyPi-style storage on Raspberry Pi (or Linux).
#   - (--full)  DESTRUCTIVE: Wipes WHOLE device (/dev/sdX), creates single ext4
#                partition, labels it (default: hobypi-data), sets fstab for
#                LABEL-based, systemd automount, mounts once now, fixes ownership.
#   - (--adopt) NON-DESTRUCTIVE: Reuses an EXISTING partition (/dev/sdX1).
#                No repartitioning/formatting. Tries to set the label safely.
#                If labeling not supported, falls back to UUID in fstab.
#
# Why LABEL and systemd automount?
#   - LABEL: Any stick labeled "hobypi-data" will mount to the same path
#            (/mnt/hobypi-data) on any Pi with the same fstab entry.
#            This is more portable than UUID (which is per-device).
#   - systemd automount: Not “always-on”; it mounts automatically on first access,
#            and boots won’t hang if the USB is missing (thanks to 'nofail').
#
# Result:
#   A friendly, stable path like /mnt/hobypi-data that "just works" for apps
#   (SQLite, Postgres, backups, etc.) without hard-coding device names.
#
# Usage:
#   sudo ./prepare_usb_storage.sh --full  /dev/sdX  [LABEL] [-y]
#   sudo ./prepare_usb_storage.sh --adopt /dev/sdX1 [LABEL]
#
# Examples:
#   # FULL WIPE (creates ext4, LABEL=hobypi-data)
#   sudo ./prepare_usb_storage.sh --full /dev/sda hobypi-data -y
#
#   # ADOPT existing partition without wiping (tries to set LABEL)
#   sudo ./prepare_usb_storage.sh --adopt /dev/sda1 hobypi-data
#
# What gets written to /etc/fstab:
#   LABEL=<label> /mnt/<label> ext4 defaults,noatime,x-systemd.automount,noauto,nofail 0 2
#   (If we can't set a label: UUID=<uuid> ... <fstype> ... same options)
#
# Key options explained:
#   - noatime               : reduce writes on flash (performance & longevity)
#   - x-systemd.automount   : mount on first access (hot-plug-friendly)
#   - noauto                : don’t mount at boot; automount handles it on demand
#   - nofail                : if the USB is missing, boot continues normally
#
# Requirements:
#   - Core: bash, lsblk, blkid, mount/umount, grep, awk, sed, df, systemctl
#   - FULL mode: parted, partprobe, wipefs, mkfs.ext4, e2label
#   - ADOPT mode label tools (optional, only if labeling that FS):
#       * ext4  : e2label     (pkg: e2fsprogs)
#       * FAT   : dosfslabel  (pkg: dosfstools)
#       * NTFS  : ntfslabel   (pkg: ntfs-3g)
#       * exFAT : exfatlabel  (pkg: exfatprogs)
#
# Safety:
#   - FULL mode demands device confirmation (or '-y') and refuses mmcblk0 (Pi OS).
#   - Backs up /etc/fstab each run: /etc/fstab.YYYYMMDD-HHMMSS.bak
#
# Troubleshooting:
#   - After editing fstab, run: sudo systemctl daemon-reload
#   - To force mount right now: sudo mount /mnt/<label>
#   - To see why a mount failed: journalctl -u systemd-automount -b
#   - If stick is missing at boot: it’ll mount later on first access (automount).
#
# Postgres tip:
#   - Create data dir on the USB:  sudo mkdir -p /mnt/hobypi-data/pgdata
#                                  sudo chown -R postgres:postgres /mnt/hobypi-data/pgdata
#   - Point PGDATA there, native or Docker bind mount.
# ==============================================================================

set -euo pipefail

# -------- Configuration defaults --------
DEFAULT_LABEL="hobypi-data"

# -------- Helpers (small, focused functions) --------

die() { echo "Error: $*" >&2; exit 1; }

need_root() {
  # We must be root for partitioning, formatting, fstab updates, mounting.
  [[ "${EUID}" -eq 0 ]] || die "Please run with sudo."
}

cmd_exists() { command -v "$1" >/dev/null 2>&1; }

# Given a whole device (/dev/sdX) or a partition (/dev/sdX1),
# return a single partition path we can work with for ADOPT mode.
get_partition_from_device() {
  local dev="$1"

  # If caller passed a partition (ends with a digit), accept it directly.
  if [[ -b "$dev" && "$dev" =~ [0-9]$ ]]; then
    echo "$dev"
    return 0
  fi

  # Otherwise, caller passed a whole device; find exactly one partition under it.
  local kids
  kids=$(lsblk -nrpo NAME "$dev" | tail -n +2 || true)

  local count
  count=$(echo "$kids" | awk 'NF' | wc -l | tr -d ' ')
  if [[ -z "$kids" || "$count" -eq 0 ]]; then
    die "No partitions found under $dev. For --adopt, pass a partition (e.g., /dev/sda1) or use --full to create one."
  fi
  if [[ "$count" -gt 1 ]]; then
    die "Multiple partitions found under $dev. For --adopt, specify the exact partition (e.g., /dev/sda1)."
  fi

  echo "$kids" | awk 'NR==1{print}'
}

# Unmount any mountpoints found under a device or partition.
safe_umount_all_under() {
  local dev="$1"
  mapfile -t MOUNTS < <(lsblk -nrpo MOUNTPOINT "$dev" | awk 'NF')
  for m in "${MOUNTS[@]:-}"; do
    echo "  - umount ${m}"
    umount -f "$m" || true
  done
}

# Backup /etc/fstab with a timestamped filename for safe rollback.
fstab_backup() {
  local backup="/etc/fstab.$(date +%Y%m%d-%H%M%S).bak"
  echo ">>> Backing up /etc/fstab to ${backup}..."
  cp /etc/fstab "$backup"
}

# Write (replace) a single fstab line mapping selector -> mountpoint with chosen FS type and safe options.
# selector: "LABEL=foo" OR "UUID=xxxx-xxxx"
# mnt     : "/mnt/foo"
# fstype  : "ext4", "vfat", "ntfs", "exfat", etc.
fstab_write_line() {
  local selector="$1"
  local mnt="$2"
  local fstype="$3"

  # Automount options keep boot clean and mount on demand.
  local opts="defaults,noatime,x-systemd.automount,noauto,nofail"

  echo ">>> Updating /etc/fstab (${selector} -> ${mnt}, ${fstype})..."
  # Remove any old line that references this selector or mountpoint.
  grep -v -E "${selector}[[:space:]]|[[:space:]]${mnt}[[:space:]]" /etc/fstab > /etc/fstab.tmp || true
  echo "${selector}  ${mnt}  ${fstype}  ${opts}  0  2" >> /etc/fstab.tmp
  mv /etc/fstab.tmp /etc/fstab
}

# Attempt to (re)label a partition depending on filesystem type.
# Returns 0 if labeling succeeded, non-zero if not supported or tool missing.
set_label_if_possible() {
  local part="$1" fstype="$2" label="$3"
  case "$fstype" in
    ext2|ext3|ext4)
      if cmd_exists e2label; then
        echo ">>> Setting ext* label to '${label}'..."
        e2label "$part" "$label"
        return 0
      fi
      ;;
    vfat|fat|fat16|fat32)
      if cmd_exists dosfslabel; then
        echo ">>> Setting FAT label to '${label}'..."
        dosfslabel "$part" "$label"
        return 0
      fi
      ;;
    ntfs)
      if cmd_exists ntfslabel; then
        echo ">>> Setting NTFS label to '${label}'..."
        ntfslabel "$part" "$label"
        return 0
      fi
      ;;
    exfat)
      # On Raspberry Pi OS Bookworm: exfatprogs provides exfatlabel.
      if cmd_exists exfatlabel; then
        echo ">>> Setting exFAT label to '${label}'..."
        exfatlabel "$part" "$label"
        return 0
      fi
      ;;
  esac
  echo ">>> Could not set label for fstype='${fstype}' (tool missing or unsupported). Will use UUID in fstab."
  return 1
}

# Pretty summary at the end for humans.
print_summary() {
  local sel="$1" mnt="$2"
  echo
  echo ">>> Completed."
  echo "  Mountpoint : ${mnt}"
  echo "  fstab key  : ${sel}"
  echo
  df -h "${mnt}" || true
  echo
  echo "Note: With x-systemd.automount, ${mnt} mounts on first access if the USB is plugged in."
}

# -------- Mode implementations --------

# --full : destructive, create new ext4 + label + fstab + mount
run_full() {
  local dev="$1" label="$2" confirm="$3"

  need_root
  [[ -b "$dev" ]] || die "$dev is not a block device."
  # Defensive: never touch the Pi's own OS card.
  [[ "$dev" != *"mmcblk0"* ]] || die "Refusing to operate on ${dev} (Pi's system card)."

  # Require explicit confirmation unless '-y' was passed.
  if [[ "$confirm" != "-y" ]]; then
    echo "WARNING: This will ERASE ALL DATA on ${dev}."
    read -r -p "Type the device path (${dev}) to confirm: " ans
    [[ "$ans" == "$dev" ]] || die "Confirmation failed."
  fi

  echo ">>> Unmounting any mounts under ${dev}..."
  safe_umount_all_under "$dev"

  echo ">>> Wiping signatures & creating GPT + single partition..."
  # wipefs removes old filesystem signatures (safe; we will format anyway)
  wipefs -a "$dev"
  # Create a modern GPT table with one primary partition
  parted -s "$dev" mklabel gpt
  parted -s "$dev" mkpart primary ext4 1MiB 100%
  # Let the kernel re-read the partition table
  partprobe "$dev"; sleep 2

  local part="${dev}1"
  [[ -b "$part" ]] || die "Partition ${part} not found after creation."

  echo ">>> Making ext4 filesystem with label '${label}'..."
  mkfs.ext4 -F -L "$label" "$part"

  local mnt="/mnt/${label}"
  echo ">>> Creating mountpoint ${mnt}..."
  mkdir -p "$mnt"

  fstab_backup
  # We can rely on LABEL because we just set it on a fresh ext4.
  fstab_write_line "LABEL=${label}" "$mnt" "ext4"

  echo ">>> Reloading systemd units & mounting once..."
  systemctl daemon-reload
  # Mount now so we can fix ownership immediately
  mount "$mnt"

  local user="${SUDO_USER:-$(id -un)}"
  echo ">>> chown ${user}:${user} ${mnt}"
  chown "${user}:${user}" "$mnt"

  print_summary "LABEL=${label}" "$mnt"
}

# --adopt : non-destructive, reuse existing partition; try to LABEL; else fallback to UUID
run_adopt() {
  local dev_or_part="$1" label="$2"

  need_root
  [[ -b "$dev_or_part" ]] || die "$dev_or_part is not a block device or partition."

  # Resolve a single partition to work with.
  local part
  part=$(get_partition_from_device "$dev_or_part")
  [[ -b "$part" ]] || die "Partition ${part} not found."

  echo ">>> Inspecting existing filesystem..."
  local fstype uuid cur_label
  fstype=$(blkid -s TYPE -o value "$part" || true)
  uuid=$(blkid -s UUID -o value "$part" || true)
  cur_label=$(blkid -s LABEL -o value "$part" || true)
  [[ -n "$fstype" ]] || die "Cannot determine filesystem type on ${part}. Aborting to avoid damage."

  echo "    Partition: ${part}"
  echo "    FSType   : ${fstype}"
  echo "    UUID     : ${uuid:-unknown}"
  echo "    Label    : ${cur_label:-<none>}"

  echo ">>> Unmounting any mounts on ${part}..."
  safe_umount_all_under "$part"

  local selector=""
  local mnt="/mnt/${label}"

  # Try to set the desired label non-destructively; if that fails, use UUID.
  if [[ "$cur_label" != "$label" ]]; then
    if set_label_if_possible "$part" "$fstype" "$label"; then
      selector="LABEL=${label}"
    else
      [[ -n "$uuid" ]] || die "No UUID available to use in fstab. Cannot proceed."
      selector="UUID=${uuid}"
      echo ">>> Using ${selector} in fstab (label unchanged)."
    fi
  else
    # Already has the desired label
    selector="LABEL=${label}"
  fi

  echo ">>> Creating mountpoint ${mnt}..."
  mkdir -p "$mnt"

  fstab_backup
  fstab_write_line "${selector}" "$mnt" "$fstype"

  echo ">>> Reloading systemd units & mounting once..."
  systemctl daemon-reload
  # Attempt to mount now (if device is present); automount will handle future accesses.
  mount "$mnt" || true

  local user="${SUDO_USER:-$(id -un)}"
  echo ">>> chown ${user}:${user} ${mnt}"
  chown "${user}:${user}" "$mnt" || true

  print_summary "${selector}" "$mnt"
}

# -------- Argument parsing / dispatch --------

MODE="${1:-}"
DEVICE="${2:-}"
LABEL="${3:-$DEFAULT_LABEL}"
CONFIRM="${4:-}"

case "$MODE" in
  --full)
    [[ -n "${DEVICE}" ]] || die "Usage: sudo $0 --full /dev/sdX [LABEL] [-y]"
    run_full "$DEVICE" "$LABEL" "$CONFIRM"
    ;;
  --adopt)
    [[ -n "${DEVICE}" ]] || die "Usage: sudo $0 --adopt /dev/sdX1 [LABEL]"
    run_adopt "$DEVICE" "$LABEL"
    ;;
  *)
    cat >&2 <<EOF
Usage:
  sudo $0 --full  /dev/sdX  [LABEL] [-y]   # DESTRUCTIVE. Create ext4+LABEL, LABEL-based automount.
  sudo $0 --adopt /dev/sdX1 [LABEL]        # NON-DESTRUCTIVE. Reuse existing partition, try LABEL, else UUID.

Notes:
  - For --full, PASS THE WHOLE DEVICE (e.g., /dev/sda), not a partition.
  - For --adopt, pass a PARTITION (e.g., /dev/sda1). If you pass /dev/sda, it must contain exactly one partition.
  - fstab uses: x-systemd.automount,noauto,nofail to avoid boot hangs and mount on first access.
  - Default label: ${DEFAULT_LABEL}
EOF
    exit 1
    ;;
esac
