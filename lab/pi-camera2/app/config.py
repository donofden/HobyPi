"""Configuration helpers for the standalone Pi camera module."""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = PROJECT_ROOT / ".env"


def _load_env_file() -> None:
    """Load environment variables from the configured dotenv file.

    A specific file can be targeted by setting ``PI_CAMERA_ENV_FILE``; otherwise the
    module tries ``project/.env`` if it exists. Variables already set in the process
    environment are left untouched.

    Returns:
        None: This helper mutates process environment variables in place.
    """

    env_override = os.environ.get("PI_CAMERA_ENV_FILE")
    if env_override:
        env_path = Path(env_override).expanduser()
        if env_path.exists():
            load_dotenv(dotenv_path=env_path, override=False)
    elif DEFAULT_ENV_FILE.exists():
        load_dotenv(dotenv_path=DEFAULT_ENV_FILE, override=False)


def _get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    """Read an environment variable while keeping the default handling consistent.

    Args:
        name: Name of the environment variable to read.
        default: Fallback value when the variable is undefined.

    Returns:
        Optional[str]: The environment value or the fallback when absent.
    """

    return os.environ.get(name, default)


def _to_bool(value: Optional[str], default: bool = False) -> bool:
    """Convert common truthy/falsey strings to ``bool`` with a fallback.

    Args:
        value: The textual value to interpret.
        default: Value to use when parsing fails.

    Returns:
        bool: Parsed boolean flag.
    """

    if value is None:
        return default
    value = value.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    return default


def _to_int(value: Optional[str], default: int) -> int:
    """Convert the provided value to ``int`` or return the supplied default.

    Args:
        value: The textual value to coerce.
        default: Fallback integer when parsing fails.

    Returns:
        int: Parsed integer or the default.
    """

    try:
        return int(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def _resolve_path(value: Optional[str], default: Path) -> Path:
    """Resolve relative paths against the project root for predictable storage.

    Args:
        value: Provided path, possibly relative.
        default: Fallback location when ``value`` is missing.

    Returns:
        Path: Absolute filesystem path.
    """

    if value:
        candidate = Path(value).expanduser()
        if not candidate.is_absolute():
            candidate = PROJECT_ROOT / candidate
        return candidate
    return default


@dataclass
class CameraSettings:
    """Runtime configuration for the camera controller and FastAPI service.

    Attributes mirror the environment variables documented in the README so other
    components can rely on a single source of truth.
    """

    name: str
    camera_type: str
    camera_device: str
    sensor_id: Optional[str]
    width: int
    height: int
    fps: int
    quality: int
    hflip: bool
    vflip: bool
    enable_stream: bool
    enable_snapshots: bool
    enable_recording: bool
    record_bitrate: Optional[int]
    auto_start_stream: bool
    auto_free_camera: bool
    manage_pipewire: bool
    log_size: int
    snapshot_dir: Path
    video_dir: Path
    storage_root: Path
    host: str
    port: int
    mjpeg_boundary: str
    snapshot_prefix: str
    snapshot_extension: str
    video_prefix: str
    video_extension: str

    def ensure_directories(self) -> None:
        """Create snapshot and video directories so the API can serve them safely.

        Returns:
            None: Directories are created for their side effects only.
        """

        self.storage_root.mkdir(parents=True, exist_ok=True)
        self.snapshot_dir.mkdir(parents=True, exist_ok=True)
        self.video_dir.mkdir(parents=True, exist_ok=True)


def load_settings() -> CameraSettings:
    """Build a :class:`CameraSettings` object from environment variables.

    Returns:
        CameraSettings: Fully resolved configuration ready for the controller.
    """

    _load_env_file()

    storage_root = _resolve_path(
        _get_env("PI_CAMERA_STORAGE_ROOT"),
        PROJECT_ROOT / "storage",
    )

    snapshot_dir = _resolve_path(
        _get_env("PI_CAMERA_SNAPSHOT_DIR"),
        storage_root / "snapshots",
    )

    video_dir = _resolve_path(
        _get_env("PI_CAMERA_VIDEO_DIR"),
        storage_root / "videos",
    )

    settings = CameraSettings(
        name=_get_env("PI_CAMERA_NAME", "default"),
        camera_type=_get_env("PI_CAMERA_TYPE", "picamera2"),
        camera_device=_get_env("PI_CAMERA_DEVICE", "/dev/video0"),
        sensor_id=_get_env("PI_CAMERA_SENSOR_ID"),
        width=_to_int(_get_env("PI_CAMERA_WIDTH"), 1280),
        height=_to_int(_get_env("PI_CAMERA_HEIGHT"), 720),
        fps=_to_int(_get_env("PI_CAMERA_FPS"), 30),
        quality=_to_int(_get_env("PI_CAMERA_QUALITY"), 80),
        hflip=_to_bool(_get_env("PI_CAMERA_HFLIP"), False),
        vflip=_to_bool(_get_env("PI_CAMERA_VFLIP"), False),
        enable_stream=_to_bool(_get_env("PI_CAMERA_ENABLE_STREAM"), True),
        enable_snapshots=_to_bool(_get_env("PI_CAMERA_ENABLE_SNAPSHOTS"), True),
        enable_recording=_to_bool(_get_env("PI_CAMERA_ENABLE_RECORDING"), True),
        record_bitrate=_to_int(_get_env("PI_CAMERA_RECORD_BITRATE"), 0) or None,
        auto_start_stream=_to_bool(_get_env("PI_CAMERA_AUTO_START_STREAM"), True),
        auto_free_camera=_to_bool(_get_env("PI_CAMERA_AUTO_FREE_CAMERA"), True),
        manage_pipewire=_to_bool(_get_env("PI_CAMERA_MANAGE_PIPEWIRE"), True),
        log_size=_to_int(_get_env("PI_CAMERA_LOG_SIZE"), 400),
        snapshot_dir=snapshot_dir,
        video_dir=video_dir,
        storage_root=storage_root,
        host=_get_env("PI_CAMERA_HOST", "0.0.0.0"),
        port=_to_int(_get_env("PI_CAMERA_PORT"), 8001),
        mjpeg_boundary=_get_env("PI_CAMERA_MJPEG_BOUNDARY", "FRAME"),
        snapshot_prefix=_get_env("PI_CAMERA_SNAPSHOT_PREFIX", "snap"),
        snapshot_extension=_get_env("PI_CAMERA_SNAPSHOT_EXTENSION", "jpg"),
        video_prefix=_get_env("PI_CAMERA_VIDEO_PREFIX", "rec"),
        video_extension=_get_env("PI_CAMERA_VIDEO_EXTENSION", "mp4"),
    )

    settings.ensure_directories()
    return settings


__all__ = ["CameraSettings", "load_settings", "PROJECT_ROOT"]
