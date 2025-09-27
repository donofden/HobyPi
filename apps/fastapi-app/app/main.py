from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import subprocess
from pathlib import Path
import json

app = FastAPI(title="HobyPi API", version="0.1.0")

# CORS: allow your React dev server (port 3000) and same-origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def read_temp_c() -> float:
    """Read CPU temp: try vcgencmd, fallback to sysfs."""
    try:
        out = subprocess.check_output(["vcgencmd", "measure_temp"], text=True).strip()
        # out like: temp=48.0'C
        val = out.split("=")[1].split("'")[0]
        return float(val)
    except Exception:
        # fallback: millidegrees
        tfile = Path("/sys/class/thermal/thermal_zone0/temp")
        if tfile.exists():
            raw = tfile.read_text().strip()
            return round(int(raw) / 1000.0, 1)
        raise RuntimeError("No temperature source available")

def read_throttled() -> str | None:
    try:
        out = subprocess.check_output(["vcgencmd", "get_throttled"], text=True).strip()
        # e.g. throttled=0x0
        return out.split("=")[1]
    except Exception:
        return None

@app.get("/api/temp")
def api_temp():
    temp_c = read_temp_c()
    throttled = read_throttled()
    return {
        "time": datetime.utcnow().isoformat() + "Z",
        "temp_c": temp_c,
        "throttled": throttled,
    }

@app.get("/api/health")
def api_health():
    # minimal health for now
    return {"ok": True, "time": datetime.utcnow().isoformat() + "Z"}
