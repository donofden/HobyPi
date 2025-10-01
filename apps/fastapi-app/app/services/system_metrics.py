"""
System Metrics Collection Service

This module provides functions to collect comprehensive system metrics
from a Raspberry Pi including:
- CPU temperature via vcgencmd or thermal zones
- Throttling status and performance limitations
- CPU usage, memory, disk, and network statistics
- Top processes by resource usage

Designed specifically for Raspberry Pi but includes fallbacks for other systems.
"""
from datetime import datetime
from pathlib import Path
from statistics import mean
import subprocess
import time
import os
import psutil

# -------- Raspberry Pi specific helpers --------

def _vcgencmd(args: list[str]) -> str | None:
    """
    Execute vcgencmd command for Raspberry Pi system information.
    
    Args:
        args: Command arguments to pass to vcgencmd
        
    Returns:
        Command output as string, or None if command fails
    """
    try:
        out = subprocess.check_output(["vcgencmd", *args], text=True).strip()
        return out
    except Exception:
        return None

def read_temp_c() -> float:
    """
    Read CPU temperature in Celsius.
    
    Tries vcgencmd first (Raspberry Pi), then falls back to thermal zone.
    
    Returns:
        CPU temperature in Celsius
        
    Raises:
        RuntimeError: If no temperature source is available
    """
    # Try Raspberry Pi vcgencmd first
    out = _vcgencmd(["measure_temp"])
    if out:
        # Parse output like "temp=48.0'C"
        val = out.split("=")[1].split("'")[0]
        return float(val)
    
    # Fallback to thermal zone (works on most Linux systems)
    tfile = Path("/sys/class/thermal/thermal_zone0/temp")
    if tfile.exists():
        raw = tfile.read_text().strip()
        return round(int(raw) / 1000.0, 1)
    
    raise RuntimeError("No temperature source available")

def read_throttled_hex() -> str | None:
    """
    Read throttling status from Raspberry Pi.
    
    Returns:
        Hex string representing throttling status, or None if unavailable
    """
    out = _vcgencmd(["get_throttled"])
    if not out:
        return None
    # Parse output like "throttled=0x0"
    return out.split("=")[1]

def decode_throttled(hex_str: str) -> dict:
    """
    Decode Raspberry Pi throttling status bits.
    
    The throttling value is a bitmask where:
    - Bit 0: Under-voltage detected
    - Bit 1: Arm frequency capped
    - Bit 2: Currently throttled
    - Bit 3: Soft temperature limit active
    - Bits 16-19: Same conditions have occurred since boot
    
    Args:
        hex_str: Hex string from vcgencmd get_throttled
        
    Returns:
        Dictionary with decoded throttling conditions
    """
    try:
        val = int(hex_str, 16) if hex_str.startswith("0x") else int(hex_str, 0)
    except Exception:
        return {"raw": hex_str}
    
    def b(i): 
        """Check if bit i is set"""
        return bool(val & (1 << i))
    
    return {
        "raw": hex_str,
        "undervoltage": {"active": b(0), "occurred": b(16)},
        "freq_capped":  {"active": b(1), "occurred": b(17)},
        "throttled":    {"active": b(2), "occurred": b(18)},
        "soft_temp_limit": {"active": b(3), "occurred": b(19)},
    }

# -------- General system utilities --------

def bytes2human(n: int) -> str:
    """
    Convert bytes to human-readable format.
    
    Args:
        n: Number of bytes
        
    Returns:
        Human-readable string (e.g., "1.5 GiB")
    """
    if n < 1024: 
        return f"{n} B"
    
    units = "KMGTPE"
    i, f = 0, float(n)
    while f >= 1024 and i < len(units) - 1:
        f /= 1024.0
        i += 1
    return f"{f:.1f} {units[i]}iB"

def uptime_seconds() -> float:
    """
    Get system uptime in seconds.
    
    Returns:
        System uptime in seconds since boot
    """
    return max(0.0, time.time() - psutil.boot_time())

def top_processes(sample_ms: int, n: int) -> list[dict]:
    """
    Get top N processes by CPU usage.
    
    Uses two-pass sampling for accurate CPU percentage measurements.
    
    Args:
        sample_ms: Sampling window in milliseconds
        n: Number of top processes to return
        
    Returns:
        List of process dictionaries sorted by CPU usage
    """
    # First pass: initialize CPU sampling for all processes
    for p in psutil.process_iter():
        try:
            p.cpu_percent(None)  # Initialize sampling
        except Exception:
            pass
    
    # Wait for sampling window
    time.sleep(max(0.0, sample_ms / 1000.0))
    
    # Second pass: collect actual measurements
    rows = []
    for p in psutil.process_iter(["pid", "name", "memory_info"]):
        try:
            rows.append({
                "pid": p.pid,
                "name": p.info.get("name") or "",
                "cpu": round(p.cpu_percent(None), 1),
                "rss": (p.info["memory_info"].rss if p.info.get("memory_info") else 0),
            })
        except Exception:
            continue
    
    # Sort by CPU usage, then by memory usage
    rows.sort(key=lambda x: (x["cpu"], x["rss"]), reverse=True)
    return rows[:n]

# -------- Payload builders for API responses --------

def build_temp_payload() -> dict:
    """
    Build temperature and throttling status payload.
    
    Returns:
        Dictionary with current temperature and throttling information
    """
    temp_c = read_temp_c()
    throttled_hex = read_throttled_hex()
    
    return {
        "time": datetime.utcnow().isoformat() + "Z",
        "temp_c": temp_c,
        "throttled": throttled_hex,
        "throttled_flags": decode_throttled(throttled_hex) if throttled_hex else None,
    }

def build_metrics_payload(sample_ms: int, top_n: int) -> dict:
    """
    Build comprehensive system metrics payload.
    
    Collects CPU, memory, disk, network, and process information.
    
    Args:
        sample_ms: CPU sampling window in milliseconds
        top_n: Number of top processes to include
        
    Returns:
        Dictionary with comprehensive system metrics
    """
    # CPU metrics with per-core breakdown
    cpu_perc = psutil.cpu_percent(
        interval=sample_ms / 1000.0 if sample_ms else None, 
        percpu=True
    )
    cpu_avg = round(mean(cpu_perc), 1) if cpu_perc else 0.0
    # CPU frequency information (may not be available on all systems)
    try:
        freqs = [int(f.current) for f in psutil.cpu_freq(percpu=True)]
    except Exception:
        freqs = None

    # Memory and swap information
    vm = psutil.virtual_memory()
    sm = psutil.swap_memory()
    
    # Disk usage for root filesystem
    disk = psutil.disk_usage("/")

    # System load averages (1, 5, 15 minutes)
    try:
        load1, load5, load15 = os.getloadavg()
    except OSError:
        load1 = load5 = load15 = 0.0

    # System uptime
    up = uptime_seconds()

    # Network interface statistics
    try:
        net = {
            nic: {"rx": io.bytes_recv, "tx": io.bytes_sent}
            for nic, io in psutil.net_io_counters(pernic=True).items()
        }
    except Exception:
        net = None

    # Temperature and throttling (Raspberry Pi specific)
    temp_c = None
    throttled_hex = None
    try:
        temp_c = read_temp_c()
        throttled_hex = read_throttled_hex()
    except Exception:
        pass

    # Top processes by CPU usage
    tops = top_processes(sample_ms=max(100, sample_ms), n=top_n) if top_n else []

    return {
        "time": datetime.utcnow().isoformat() + "Z",
        "cpu": {
            "per_core": cpu_perc,
            "avg": cpu_avg,
            "freq_mhz": freqs,
            "count": psutil.cpu_count(logical=True),
        },
        "memory": {
            "total": vm.total, 
            "available": vm.available, 
            "used": vm.used, 
            "percent": vm.percent
        },
        "swap": {
            "total": sm.total, 
            "used": sm.used, 
            "free": sm.free, 
            "percent": sm.percent
        },
        "disk_root": {
            "total": disk.total, 
            "used": disk.used, 
            "free": disk.free, 
            "percent": disk.percent
        },
        "load": {"1": load1, "5": load5, "15": load15},
        "uptime_sec": int(up),
        "net_bytes": net,
        "temperature_c": temp_c,
        "throttled": {
            "hex": throttled_hex,
            "flags": decode_throttled(throttled_hex) if throttled_hex else None,
        },
        "top": tops,
        "human": {
            "mem_used": bytes2human(vm.used),
            "mem_total": bytes2human(vm.total),
            "disk_used": bytes2human(disk.used),
            "disk_total": bytes2human(disk.total),
            "uptime_h": round(up / 3600.0, 1),
        },
    }
