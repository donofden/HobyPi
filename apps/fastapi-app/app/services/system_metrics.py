from datetime import datetime
from pathlib import Path
from statistics import mean
import subprocess
import time
import os
import psutil

# -------- helpers that read the Pi/system --------

def _vcgencmd(args: list[str]) -> str | None:
    try:
        out = subprocess.check_output(["vcgencmd", *args], text=True).strip()
        return out
    except Exception:
        return None

def read_temp_c() -> float:
    """Read CPU temperature in °C (vcgencmd, fallback to sysfs)."""
    out = _vcgencmd(["measure_temp"])
    if out:
        # "temp=48.0'C"
        val = out.split("=")[1].split("'")[0]
        return float(val)
    tfile = Path("/sys/class/thermal/thermal_zone0/temp")
    if tfile.exists():
        raw = tfile.read_text().strip()
        return round(int(raw) / 1000.0, 1)
    raise RuntimeError("No temperature source available")

def read_throttled_hex() -> str | None:
    out = _vcgencmd(["get_throttled"])
    if not out:
        return None
    # "throttled=0x0"
    return out.split("=")[1]

def decode_throttled(hex_str: str) -> dict:
    """Decode bits from vcgencmd get_throttled."""
    try:
        val = int(hex_str, 16) if hex_str.startswith("0x") else int(hex_str, 0)
    except Exception:
        return {"raw": hex_str}
    def b(i): return bool(val & (1 << i))
    return {
        "raw": hex_str,
        "undervoltage": {"active": b(0), "occurred": b(16)},
        "freq_capped":  {"active": b(1), "occurred": b(17)},
        "throttled":    {"active": b(2), "occurred": b(18)},
        "soft_temp_limit": {"active": b(3), "occurred": b(19)},
    }

def bytes2human(n: int) -> str:
    if n < 1024: return f"{n} B"
    units = "KMGTPE"
    i, f = 0, float(n)
    while f >= 1024 and i < len(units) - 1:
        f /= 1024.0
        i += 1
    return f"{f:.1f} {units[i]}iB"

def uptime_seconds() -> float:
    return max(0.0, time.time() - psutil.boot_time())

def top_processes(sample_ms: int, n: int) -> list[dict]:
    # two-pass CPU sample for accuracy
    for p in psutil.process_iter():
        try:
            p.cpu_percent(None)
        except Exception:
            pass
    time.sleep(max(0.0, sample_ms / 1000.0))
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
    rows.sort(key=lambda x: (x["cpu"], x["rss"]), reverse=True)
    return rows[:n]

def build_temp_payload() -> dict:
    temp_c = read_temp_c()
    throttled_hex = read_throttled_hex()
    return {
        "time": datetime.utcnow().isoformat() + "Z",
        "temp_c": temp_c,
        "throttled": throttled_hex,
        "throttled_flags": decode_throttled(throttled_hex) if throttled_hex else None,
    }

def build_metrics_payload(sample_ms: int, top_n: int) -> dict:
    cpu_perc = psutil.cpu_percent(interval=sample_ms / 1000.0 if sample_ms else None, percpu=True)
    cpu_avg = round(mean(cpu_perc), 1) if cpu_perc else 0.0

    try:
        freqs = [int(f.current) for f in psutil.cpu_freq(percpu=True)]
    except Exception:
        freqs = None

    vm = psutil.virtual_memory()
    sm = psutil.swap_memory()
    disk = psutil.disk_usage("/")

    try:
        load1, load5, load15 = os.getloadavg()
    except OSError:
        load1 = load5 = load15 = 0.0

    up = uptime_seconds()

    try:
        net = {nic: {"rx": io.bytes_recv, "tx": io.bytes_sent}
               for nic, io in psutil.net_io_counters(pernic=True).items()}
    except Exception:
        net = None

    temp_c = None
    throttled_hex = None
    try:
        temp_c = read_temp_c()
        throttled_hex = read_throttled_hex()
    except Exception:
        pass

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
            "total": vm.total, "available": vm.available, "used": vm.used, "percent": vm.percent
        },
        "swap": {
            "total": sm.total, "used": sm.used, "free": sm.free, "percent": sm.percent
        },
        "disk_root": {
            "total": disk.total, "used": disk.used, "free": disk.free, "percent": disk.percent
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
