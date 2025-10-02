# Pi Camera Lab Module

This module packages the advanced camera control server into a reusable, standalone FastAPI application. It is designed for the `HobyPi` lab workspace so that you can bring up a Pi camera quickly, tweak settings, debug hardware, or reuse the control surface across future projects.

## Highlights
- ✅ **Production-ready structure** with configuration, controller, and FastAPI layers.
- ✅ **Environment-driven setup** (`.env`) that selects the camera, resolution, frame rate, storage paths, and feature toggles.
- ✅ **MJPEG live preview**, snapshots, and optional H.264 recording with bitrate control.
- ✅ **REST API + single-page UI** mirroring the original capabilities.
- ✅ **Automation aids**: Makefile targets and shell scripts for freeing the camera and installing dependencies.

## Repository Layout
```
lab/pi-camera2/
├── app/
│   ├── __init__.py            # Package exports
│   ├── config.py              # Environment-driven settings loader
│   ├── controller.py          # Camera pipeline, streaming, recording logic
│   ├── server.py              # FastAPI application factory and routes
│   └── ui/index.html          # Control panel served at /
├── scripts/
│   ├── install_system_deps.sh # Apt helper for camera stack prerequisites
│   ├── free_camera.sh         # Shortcut to free the camera devices
│   └── run_server.sh          # Invoke uvicorn with optional reload
├── .env.example               # Copy to .env to customise behaviour
├── Makefile                   # Setup, run, maintenance commands
├── main.py                    # CLI entry point (serve/free/resume)
├── requirements.txt           # Python dependencies
└── README.md                  # This guide
```

## Prerequisites
1. **Raspberry Pi OS (Bullseye or later)** with camera stack support.
2. **System packages** for Picamera2/libcamera:
   ```bash
   cd lab/pi-camera2
   make install-system-deps
   ```
   The script installs `python3-picamera2`, `python3-libcamera`, `libcamera-apps-lite`, `v4l-utils`, and `lsof`.
3. (Optional) A Python virtual environment if you want to isolate dependencies.

## Quick Start
```bash
cd lab/pi-camera2
cp .env.example .env       # adjust values for your setup
make deps                  # create venv (with system site packages) and install FastAPI + helpers
make run                   # start the FastAPI service (default 0.0.0.0:8001)
```
Then open `http://<pi-ip>:8001/` in a browser. The UI provides controls for streaming, snapshots, recording, flipping, and configuration changes. All operations are also exposed as REST endpoints under `/api/*` for programmatic use or robotics pipelines.

### FastAPI Endpoints
- `GET /stream.mjpg` – MJPEG live stream (boundary from `PI_CAMERA_MJPEG_BOUNDARY`).
- `GET /api/state` – Current running/recording state and active config.
- `GET /api/start`, `/api/stop`, `/api/pause`, `/api/resume` – Lifecycle management.
- `GET /api/flip?h=0|1&v=0|1` – Apply horizontal/vertical flips.
- `GET /api/snapshot` – Capture a still image and return its filename/URL.
- `GET /api/snaps`, `POST /api/snaps/clear` – Snapshot catalogue management.
- `GET /api/videos`, `POST /api/videos/clear` – Recorded video catalogue management.
- `GET /api/record?cmd=start|stop` – Toggle recording.
- `GET /api/config` – Return current resolution/fps/quality.
- `GET /api/config?width=...&height=...&fps=...&quality=...` – Apply a new configuration.
- `GET /api/logs` – Retrieve recent operations from the ring buffer.

Endpoints respond with JSON and standard HTTP errors (400/403/500) when an operation is disallowed or fails.

## Configuration Reference (`.env`)
| Variable | Description | Default |
| --- | --- | --- |
| `PI_CAMERA_NAME` | Friendly identifier shown in the UI/logs. | `lab-cam` |
| `PI_CAMERA_TYPE` | Camera driver backend (currently `picamera2`). | `picamera2` |
| `PI_CAMERA_DEVICE` | Camera index (`0`) or `/dev/video0` style path. | `/dev/video0` |
| `PI_CAMERA_SENSOR_ID` | Optional libcamera sensor ID for multi-camera rigs. | _(unset)_ |
| `PI_CAMERA_WIDTH`, `PI_CAMERA_HEIGHT` | Stream resolution. | `1280x720` |
| `PI_CAMERA_FPS` | Frames per second. | `30` |
| `PI_CAMERA_QUALITY` | MJPEG quality (10–100). | `80` |
| `PI_CAMERA_HFLIP`, `PI_CAMERA_VFLIP` | Initial flips. | `false` |
| `PI_CAMERA_ENABLE_STREAM` | Allow MJPEG streaming. | `true` |
| `PI_CAMERA_ENABLE_SNAPSHOTS` | Allow snapshot capture. | `true` |
| `PI_CAMERA_ENABLE_RECORDING` | Enable H.264 recording endpoints. | `true` |
| `PI_CAMERA_RECORD_BITRATE` | Override recording bitrate (bps). | auto |
| `PI_CAMERA_STORAGE_ROOT` | Base directory for media storage. | `./storage` |
| `PI_CAMERA_SNAPSHOT_DIR`, `PI_CAMERA_VIDEO_DIR` | Override snapshot/video folders. | subdirs of storage |
| `PI_CAMERA_SNAPSHOT_PREFIX`, `PI_CAMERA_VIDEO_PREFIX` | Filename prefixes. | `snap` / `rec` |
| `PI_CAMERA_SNAPSHOT_EXTENSION`, `PI_CAMERA_VIDEO_EXTENSION` | File extensions. | `jpg` / `mp4` |
| `PI_CAMERA_AUTO_START_STREAM` | Start the stream on launch. | `true` |
| `PI_CAMERA_AUTO_FREE_CAMERA` | Attempt to stop conflicting services at startup. | `true` |
| `PI_CAMERA_MANAGE_PIPEWIRE` | Stop/start PipeWire stack around camera use. | `true` |
| `PI_CAMERA_LOG_SIZE` | Ring log line capacity. | `400` |
| `PI_CAMERA_HOST`, `PI_CAMERA_PORT` | FastAPI bind address. | `0.0.0.0:8001` |
| `PI_CAMERA_MJPEG_BOUNDARY` | Boundary token for MJPEG stream. | `FRAME` |

The loader honours `PI_CAMERA_ENV_FILE` if you want to point at an alternative configuration file.

## Operational Helpers
- `make free-camera` or `scripts/free_camera.sh` runs the same logic as the legacy helper to stop PipeWire and kill processes holding `/dev/video*`/`/dev/media*`.
- `make resume-desktop` restarts the PipeWire stack when you are done testing.
- `scripts/run_server.sh` wraps uvicorn and honours `PI_CAMERA_RELOAD=1` for development auto-reload.

## Extending the Module
- **Multiple cameras**: duplicate `.env` files per setup and export `PI_CAMERA_ENV_FILE=/path/to/config.env` before running `make run`.
- **Additional endpoints**: extend `app/server.py` with new FastAPI routes, using `CameraController` methods or adding new ones.
- **Alternate backends**: the controller is structured so other camera backends can be introduced by branching on `settings.camera_type`.

## Troubleshooting
- If the stream fails with `503`, run `make free-camera` to release `/dev/video*` devices, then retry.
- For permission errors, ensure your user belongs to the `video` group and reboot after installing camera packages.
- Review `/api/logs` for contextual messages and check the terminal output from `uvicorn` for stack traces.
- **ModuleNotFoundError: `libcamera` / `picamera2`**: Remove the existing virtualenv (`make clean`) and run `make deps` so the fresh environment inherits system site packages where the camera stack lives.

## How It Works
- **config.CameraSettings** resolves environment variables once and provides strongly typed settings consumed by the rest of the stack.
- **controller.CameraController** owns the Picamera2 lifecycle, exposing thread-safe methods for streaming, recording, snapshots, and reconfiguration.
- **server.create_app** wires the controller into FastAPI, surfaces REST endpoints, and serves the HTML control panel.
- **system.py helpers** manage PipeWire services and processes so the camera device is free before Picamera2 starts.
- **main.py CLI & scripts/** wrap common tasks (`serve`, `free-camera`, `resume-desktop`) for Makefile targets and shell shortcuts.
- **app/ui/index.html** is a self-contained UI that calls the API endpoints and shows live status, snapshots, videos, and logs.

Happy tinkering! This lab module keeps the advanced controls close at hand without coupling them to the main application.
