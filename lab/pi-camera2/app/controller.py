"""Camera controller with Picamera2 integration and FastAPI-friendly surface."""
from __future__ import annotations

import io
import time
from pathlib import Path
from threading import Condition, Event, Lock
from typing import Dict, List, Optional

try:
    from libcamera import Transform  # type: ignore
    from picamera2 import Picamera2  # type: ignore
    from picamera2.encoders import H264Encoder, JpegEncoder  # type: ignore
    from picamera2.outputs import FileOutput, FfmpegOutput  # type: ignore
except ImportError as exc:  # pragma: no cover - import guard for environments without camera stack
    Picamera2 = None  # type: ignore
    Transform = None  # type: ignore
    JpegEncoder = None  # type: ignore
    H264Encoder = None  # type: ignore
    FileOutput = None  # type: ignore
    FfmpegOutput = None  # type: ignore
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None

from .config import CameraSettings
from .system import free_camera, resume_desktop_services


class RingLog:
    """Thread-safe circular log used for lightweight operator feedback."""

    def __init__(self, size: int = 200) -> None:
        self.size = size
        self._buf: List[str] = []
        self._lock = Lock()

    def add(self, message: str) -> None:
        """Append a message with a timestamp, trimming the buffer when required."""

        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{ts}] {message}"
        with self._lock:
            self._buf.append(line)
            if len(self._buf) > self.size:
                self._buf = self._buf[-self.size :]

    def lines(self) -> List[str]:
        """Return a copy of the current log contents."""

        with self._lock:
            return list(self._buf)


class StreamingOutput(io.RawIOBase):
    """MJPEG streaming sink bridging Picamera2 encoder output to HTTP clients."""

    def __init__(self, paused_flag: Event) -> None:
        super().__init__()
        self._buffer = io.BytesIO()
        self.condition = Condition()
        self.frame: Optional[bytes] = None
        self.paused_flag = paused_flag

    def writable(self) -> bool:  # pragma: no cover - RawIOBase contract
        """Signal that the sink accepts data, per ``io.RawIOBase`` contract.

        Returns:
            bool: Always ``True``.
        """

        return True

    def write(self, b):  # type: ignore[override]
        """Ingest encoded bytes from Picamera2 and publish complete JPEG frames.

        Args:
            b: Bytes-like chunk provided by the encoder.

        Returns:
            int: Number of bytes processed.
        """

        if self.paused_flag.is_set():
            return len(b)
        if isinstance(b, (memoryview, bytearray)):
            mv = memoryview(b)
            starts = len(mv) >= 2 and mv[0] == 0xFF and mv[1] == 0xD8
            chunk = mv.tobytes()
        else:
            chunk = b
            starts = chunk.startswith(b"\xFF\xD8")
        if starts:
            self._buffer.truncate()
            with self.condition:
                self.frame = self._buffer.getvalue()
                self.condition.notify_all()
            self._buffer.seek(0)
        return self._buffer.write(chunk)

    def flush(self) -> None:  # type: ignore[override]
        """Push the current buffer state to waiting clients.

        Returns:
            None
        """

        with self.condition:
            self.frame = self._buffer.getvalue()
            self.condition.notify_all()
        super().flush()


class CameraController:
    """Coordinate Picamera2 streaming, recording, and snapshots for FastAPI.

    The controller is intentionally stateful so the FastAPI layer can delegate rich
    camera interactions to a single object. All public methods are thread-safe.
    """

    def __init__(self, settings: CameraSettings) -> None:
        """Initialise controller state using the provided configuration.

        Args:
            settings: Resolved configuration produced by ``load_settings``.

        Returns:
            None
        """

        self.settings = settings
        self.log = RingLog(size=settings.log_size)
        self.lock = Lock()
        self.paused_flag = Event()
        self.running = False
        self.rec_active = False
        self.rec_file: Optional[str] = None
        self._last_operation = "idle"

        self.width = settings.width
        self.height = settings.height
        self.fps = settings.fps
        self.quality = settings.quality

        self.picam2: Optional[Picamera2] = None
        self.transform = Transform(hflip=settings.hflip, vflip=settings.vflip) if Transform else None
        self.streaming_output: Optional[StreamingOutput] = None
        self.jpeg_encoder: Optional[JpegEncoder] = None
        self.jpeg_sink: Optional[FileOutput] = None
        self.h264_encoder: Optional[H264Encoder] = None
        self.record_output: Optional[FfmpegOutput] = None

        self.log.add("Controller instantiated")

    # ------------------------------------------------------------------
    # lifecycle
    # ------------------------------------------------------------------
    def initialize(self) -> None:
        """Prepare hardware resources and auto-start streaming when enabled.

        Returns:
            None
        """

        if _IMPORT_ERROR is not None:
            raise RuntimeError(
                "Picamera2 stack not available. Install python3-picamera2/libcamera packages.") from _IMPORT_ERROR

        if self.settings.auto_free_camera:
            self.log.add("Freeing camera resources")
            free_camera(logger=self.log.add, manage_pipewire=self.settings.manage_pipewire)

        self._ensure_picamera()
        if self.settings.auto_start_stream and self.settings.enable_stream:
            try:
                self.start_stream()
            except Exception as exc:  # pragma: no cover - hardware specific
                self.log.add(f"Auto-start failed: {exc}")

    def shutdown(self) -> None:
        """Stop all pipelines, release the camera, and restart desktop services.

        Returns:
            None
        """

        self.log.add("Shutting down controller")
        with self.lock:
            if self.rec_active:
                self._stop_recording_locked()
            if self.running:
                self._stop_stream_locked()
            if self.picam2:
                try:
                    self.picam2.close()
                except Exception as exc:  # pragma: no cover
                    self.log.add(f"Error closing camera: {exc}")
                self.picam2 = None
        if self.settings.manage_pipewire:
            resume_desktop_services(self.log.add)

    # ------------------------------------------------------------------
    # camera operations
    # ------------------------------------------------------------------
    def start_stream(self) -> None:
        """Spin up the MJPEG streaming pipeline if it is not already running.

        Returns:
            None
        """

        if not self.settings.enable_stream:
            raise RuntimeError("Streaming disabled via configuration")
        with self.lock:
            if self.running:
                return
            self._ensure_picamera()
            self._set_operation(f"start stream {self.width}x{self.height}@{self.fps} q={self.quality}")
            self.jpeg_encoder = JpegEncoder(q=self.quality)
            self.streaming_output = StreamingOutput(self.paused_flag)
            self.jpeg_sink = FileOutput(io.BufferedWriter(self.streaming_output, buffer_size=1024 * 1024))
            self.picam2.configure(self._build_config())
            self.picam2.start_recording(self.jpeg_encoder, self.jpeg_sink)
            self.running = True
            self.paused_flag.clear()
            self._set_operation("running")

    def stop_stream(self) -> None:
        """Tear down the streaming pipeline and mark it as stopped.

        Returns:
            None
        """

        with self.lock:
            if not self.running:
                return
            self._stop_stream_locked()
            self._set_operation("stopped")

    def pause_stream(self) -> None:
        """Temporarily pause the encoder output without stopping the pipeline.

        Returns:
            None
        """

        self.paused_flag.set()
        self._set_operation("paused")

    def resume_stream(self) -> None:
        """Resume a paused stream.

        Returns:
            None
        """

        self.paused_flag.clear()
        self._set_operation("resumed")

    def ensure_stream(self) -> None:
        """Start the stream if it has not been started yet.

        Returns:
            None
        """

        if not self.running:
            self.start_stream()

    # ------------------------------------------------------------------
    # recording
    # ------------------------------------------------------------------
    def start_recording(self) -> str:
        """Start H.264 recording and return the active filename.

        Returns:
            str: Filename of the active recording.
        """

        if not self.settings.enable_recording:
            raise RuntimeError("Recording disabled via configuration")
        with self.lock:
            return self._start_recording_locked()

    def stop_recording(self) -> None:
        """Stop the active recording if one is running.

        Returns:
            None
        """

        with self.lock:
            if not self.rec_active:
                return
            self._stop_recording_locked()
            self._set_operation("recording stopped")

    # ------------------------------------------------------------------
    # snapshots
    # ------------------------------------------------------------------
    def snapshot(self) -> Path:
        """Capture a still image using the current configuration.

        Returns:
            Path: Filesystem path to the captured snapshot.
        """

        if not self.settings.enable_snapshots:
            raise RuntimeError("Snapshots disabled via configuration")
        with self.lock:
            self._ensure_stream_locked()
            ts = time.strftime("%Y%m%d-%H%M%S")
            filename = f"{self.settings.snapshot_prefix}-{self.width}x{self.height}-{ts}.{self.settings.snapshot_extension}"
            path = self.settings.snapshot_dir / filename
            try:
                assert self.picam2 is not None
                self.picam2.capture_file(str(path))
            except Exception:
                was_running = self.running
                if was_running:
                    self._stop_stream_locked()
                assert self.picam2 is not None
                self.picam2.capture_file(str(path))
                if was_running:
                    self._start_stream_locked()
            self.log.add(f"snapshot {filename}")
            return path

    # ------------------------------------------------------------------
    # configuration updates
    # ------------------------------------------------------------------
    def apply_config(self, *, width: int, height: int, fps: int, quality: int) -> None:
        """Apply a new resolution/fps/quality configuration to the pipelines.

        Args:
            width: Stream width in pixels.
            height: Stream height in pixels.
            fps: Target frames-per-second.
            quality: JPEG quality between 10 and 100.

        Returns:
            None
        """

        if width <= 0 or height <= 0 or fps <= 0:
            raise ValueError("Invalid configuration values")
        if not 10 <= quality <= 100:
            raise ValueError("Quality must be between 10 and 100")
        with self.lock:
            self._set_operation(f"reconfig to {width}x{height}@{fps} q={quality}")
            self.width, self.height, self.fps, self.quality = width, height, fps, quality
            was_recording = self.rec_active
            if was_recording:
                self._stop_recording_locked()
            if self.running:
                self._stop_stream_locked()
            if self.settings.enable_stream:
                self._start_stream_locked()
            if was_recording and self.settings.enable_recording:
                self._start_recording_locked()

    def update_flip(self, *, hflip: bool, vflip: bool) -> None:
        """Update the libcamera transform and restart pipelines when needed.

        Args:
            hflip: Enable horizontal flipping.
            vflip: Enable vertical flipping.

        Returns:
            None
        """

        if Transform is None:
            raise RuntimeError("libcamera Transform unavailable")
        with self.lock:
            self.transform = Transform(hflip=hflip, vflip=vflip)
            self._set_operation(f"flip to h={hflip} v={vflip}")
            was_recording = self.rec_active
            if was_recording:
                self._stop_recording_locked()
            if self.running:
                self._stop_stream_locked()
            if self.settings.enable_stream:
                self._start_stream_locked()
            if was_recording and self.settings.enable_recording:
                self._start_recording_locked()

    # ------------------------------------------------------------------
    # state helpers
    # ------------------------------------------------------------------
    def get_state(self) -> Dict[str, object]:
        """Return the runtime state consumed by the FastAPI endpoints and UI.

        Returns:
            Dict[str, object]: Serializable controller status.
        """

        return {
            "running": self.running,
            "paused": self.paused_flag.is_set(),
            "hflip": bool(self.transform.hflip) if self.transform else False,
            "vflip": bool(self.transform.vflip) if self.transform else False,
            "recording": {"active": self.rec_active, "file": self.rec_file},
            "config": {"width": self.width, "height": self.height, "fps": self.fps, "quality": self.quality},
            "op": {"status": self._last_operation},
            "settings": {
                "name": self.settings.name,
                "camera_type": self.settings.camera_type,
                "device": self.settings.camera_device,
                "snapshots_enabled": self.settings.enable_snapshots,
                "recording_enabled": self.settings.enable_recording,
            },
        }

    def list_snapshots(self) -> List[str]:
        """List available snapshot filenames sorted alphabetically.

        Returns:
            List[str]: Snapshot filenames relative to the snapshot directory.
        """

        pattern = f"*.{self.settings.snapshot_extension}"
        return sorted(p.name for p in self.settings.snapshot_dir.glob(pattern))

    def list_videos(self) -> List[str]:
        """List available recorded video filenames sorted alphabetically.

        Returns:
            List[str]: Video filenames relative to the video directory.
        """

        pattern = f"*.{self.settings.video_extension}"
        return sorted(p.name for p in self.settings.video_dir.glob(pattern))

    def clear_snapshots(self) -> int:
        """Remove all snapshot files and return how many were deleted.

        Returns:
            int: Number of snapshot files removed.
        """

        removed = 0
        for path in self.settings.snapshot_dir.glob(f"*.{self.settings.snapshot_extension}"):
            try:
                path.unlink()
                removed += 1
            except Exception as exc:
                self.log.add(f"Failed to remove snapshot {path.name}: {exc}")
        if removed:
            self.log.add(f"Removed {removed} snapshots")
        return removed

    def clear_videos(self) -> int:
        """Remove all recorded video files and return how many were deleted.

        Returns:
            int: Number of video files removed.
        """

        removed = 0
        for path in self.settings.video_dir.glob(f"*.{self.settings.video_extension}"):
            try:
                path.unlink()
                removed += 1
            except Exception as exc:
                self.log.add(f"Failed to remove video {path.name}: {exc}")
        if removed:
            self.log.add(f"Removed {removed} videos")
        return removed

    def logs(self) -> List[str]:
        """Expose the ring buffer logs for API consumption.

        Returns:
            List[str]: Lines currently buffered in the ring log.
        """

        return self.log.lines()

    def stream_generator(self):
        """Yield MJPEG frames with multipart boundaries for HTTP streaming.

        Yields:
            bytes: Multipart MJPEG chunks suitable for HTTP streaming responses.

        Raises:
            RuntimeError: If streaming is disabled or output is not yet ready.
        """

        if not self.settings.enable_stream:
            raise RuntimeError("Streaming disabled via configuration")
        with self.lock:
            if not self.running:
                raise RuntimeError("Stream not running")
            output = self.streaming_output
        if output is None:
            raise RuntimeError("Stream output not ready")
        boundary = self.settings.mjpeg_boundary.encode()
        try:
            while True:
                with output.condition:
                    output.condition.wait(timeout=0.5)
                    frame = output.frame
                if not self.running:
                    break
                if not frame:
                    continue
                # Emit a multipart segment compatible with ``multipart/x-mixed-replace``.
                yield (
                    b"--" + boundary + b"\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    + f"Content-Length: {len(frame)}\r\n\r\n".encode()
                    + frame
                    + b"\r\n"
                )
        except GeneratorExit:  # pragma: no cover - triggered on client disconnect
            pass

    # ------------------------------------------------------------------
    # internal helpers
    # ------------------------------------------------------------------
    def _ensure_picamera(self) -> None:
        """Initialise the Picamera2 instance if it has not been created yet.

        Returns:
            None
        """

        if self.picam2 is not None:
            return
        if Picamera2 is None:
            raise RuntimeError("Picamera2 not available")
        kwargs = {}
        device = self.settings.camera_device
        idx = self._extract_index(device)
        if idx is not None:
            kwargs["camera_num"] = idx
        if self.settings.sensor_id:
            kwargs["sensor_id"] = self.settings.sensor_id
        self.picam2 = Picamera2(**kwargs)

    def _build_config(self):
        """Create a libcamera configuration for the current dimensions.

        Returns:
            Any: Picamera2 configuration object ready for ``configure``.
        """

        assert self.picam2 is not None
        return self.picam2.create_video_configuration(
            main={"size": (self.width, self.height)},
            controls={"FrameRate": self.fps},
            transform=self.transform,
        )

    def _bitrate_for(self) -> int:
        """Choose a recording bitrate based on resolution, respecting overrides.

        Returns:
            int: Bitrate in bits per second.
        """

        if self.settings.record_bitrate:
            return self.settings.record_bitrate
        pixels = self.width * self.height
        if pixels >= 1920 * 1080:
            return 10_000_000
        if pixels >= 1280 * 720:
            return 6_000_000
        return 3_000_000

    def _ensure_stream_locked(self) -> None:
        """Start the stream if necessary; caller must hold ``self.lock``.

        Returns:
            None
        """

        if not self.running:
            self._start_stream_locked()

    def _stop_stream_locked(self) -> None:
        """Stop streaming internals without releasing the controller lock.

        Returns:
            None
        """

        if not self.running or not self.picam2:
            return
        self._set_operation("stopping stream")
        try:
            self.picam2.stop_recording()
        except Exception as exc:
            self.log.add(f"stop stream error: {exc}")
        self.running = False
        self.paused_flag.clear()
        prev_output = self.streaming_output
        self.jpeg_encoder = None
        self.jpeg_sink = None
        self.streaming_output = None
        if prev_output is not None:
            with prev_output.condition:
                prev_output.frame = None
                prev_output.condition.notify_all()

    def _start_stream_locked(self) -> None:
        """Start streaming internals; caller must hold ``self.lock``.

        Returns:
            None
        """

        if not self.settings.enable_stream:
            return
        self._ensure_picamera()
        self.jpeg_encoder = JpegEncoder(q=self.quality)
        self.streaming_output = StreamingOutput(self.paused_flag)
        # Buffered writer keeps frame delivery smooth for multiple HTTP clients.
        self.jpeg_sink = FileOutput(io.BufferedWriter(self.streaming_output, buffer_size=1024 * 1024))
        assert self.picam2 is not None
        self.picam2.configure(self._build_config())
        self.picam2.start_recording(self.jpeg_encoder, self.jpeg_sink)
        self.running = True
        self.paused_flag.clear()
        self._set_operation("running")

    def _start_recording_locked(self) -> str:
        """Internal helper that assumes ``self.lock`` is held.

        Returns:
            str: Filename of the recording that is now active.
        """

        if self.rec_active:
            return self.rec_file or ""
        self._ensure_stream_locked()
        bitrate = self._bitrate_for()
        ts = time.strftime("%Y%m%d-%H%M%S")
        filename = f"{self.settings.video_prefix}-{self.width}x{self.height}-{ts}.{self.settings.video_extension}"
        filepath = self.settings.video_dir / filename
        self._set_operation(f"start recording -> {filename}")
        self.h264_encoder = H264Encoder(bitrate=bitrate)
        self.record_output = FfmpegOutput(str(filepath), audio=False)
        assert self.picam2 is not None
        # Attach a second encoder so recording runs alongside the MJPEG preview.
        self.picam2.start_encoder(self.h264_encoder, self.record_output)
        self.rec_active = True
        self.rec_file = filename
        self._set_operation(f"recording -> {filename}")
        return filename

    def _stop_recording_locked(self) -> None:
        """Stop recording internals while ``self.lock`` is held.

        Returns:
            None
        """

        if not self.rec_active or not self.picam2 or not self.h264_encoder:
            self.rec_active = False
            self.rec_file = None
            return
        self._set_operation("stop recording")
        try:
            self.picam2.stop_encoder(self.h264_encoder)
        except Exception as exc:
            self.log.add(f"stop_encoder error: {exc}")
        self.h264_encoder = None
        self.record_output = None
        self.rec_active = False

    def _set_operation(self, message: str) -> None:
        """Update the last operation marker and record the event.

        Args:
            message: Description of the operation for audit logs.

        Returns:
            None
        """

        self._last_operation = message
        self.log.add(message)

    @staticmethod
    def _extract_index(device: Optional[str]) -> Optional[int]:
        """Best-effort extraction of a camera index from a device string.

        Args:
            device: Camera identifier, e.g. ``0`` or ``/dev/video0``.

        Returns:
            Optional[int]: Parsed camera index or ``None`` when parsing fails.
        """

        if not device:
            return None
        try:
            return int(device)
        except ValueError:
            pass
        if device.startswith("/dev/video"):
            try:
                return int(device.split("/dev/video", 1)[1])
            except (IndexError, ValueError):
                return None
        return None


__all__ = ["CameraController", "RingLog", "StreamingOutput"]
