"""FastAPI application exposing the camera controller."""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .config import CameraSettings, PROJECT_ROOT, load_settings
from .controller import CameraController

UI_INDEX = PROJECT_ROOT / "app/ui/index.html"


def _load_index_html() -> str:
    """Read the bundled control panel HTML from disk.

    Returns:
        str: HTML markup for the control panel.

    Raises:
        FileNotFoundError: When the UI asset is missing.
    """

    if not UI_INDEX.exists():
        raise FileNotFoundError(f"UI page missing: {UI_INDEX}")
    return UI_INDEX.read_text(encoding="utf-8")


def create_app(settings: Optional[CameraSettings] = None) -> FastAPI:
    """Instantiate the FastAPI app wired to a camera controller instance.

    Args:
        settings: Optional pre-loaded settings to reuse, mainly for tests.

    Returns:
        FastAPI: Configured application ready to serve requests.
    """

    settings = settings or load_settings()
    controller = CameraController(settings)
    index_html = _load_index_html()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        controller.initialize()
        try:
            yield
        finally:
            controller.shutdown()

    app = FastAPI(
        title="Pi Camera Control",
        description="Standalone FastAPI surface for Picamera2 streaming, control, and media management.",
        lifespan=lifespan,
        openapi_tags=TAGS_METADATA,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    app.state.controller = controller
    app.state.settings = settings

    # Expose media directories for direct downloads
    app.mount("/snapshots", StaticFiles(directory=settings.snapshot_dir), name="snapshots")
    app.mount("/videos", StaticFiles(directory=settings.video_dir), name="videos")

    def get_controller(request: Request) -> CameraController:
        return request.app.state.controller  # type: ignore[attr-defined]

    def get_settings(request: Request) -> CameraSettings:
        return request.app.state.settings  # type: ignore[attr-defined]

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def root() -> HTMLResponse:
        """Serve the static control panel.

        Returns:
            HTMLResponse: Pre-rendered UI markup.
        """

        return HTMLResponse(index_html)

    @app.get("/health", tags=["diagnostics"])
    def health() -> dict:
        """Lightweight probe for deployment checks.

        Returns:
            dict: Health payload consumed by status monitors.
        """

        return {"ok": True}

    @app.get("/stream.mjpg", tags=["stream"])
    def stream(controller: CameraController = Depends(get_controller), settings: CameraSettings = Depends(get_settings)):
        """Proxy MJPEG output from the controller to HTTP clients.

        Args:
            controller: Injected camera controller instance.
            settings: Active camera settings for header configuration.

        Returns:
            StreamingResponse: Multipart MJPEG stream.
        """

        try:
            generator = controller.stream_generator()
        except RuntimeError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        headers = {
            "Cache-Control": "no-cache, private, no-transform",
            "Pragma": "no-cache",
            "Connection": "close",
        }
        media_type = f"multipart/x-mixed-replace; boundary={settings.mjpeg_boundary}"
        return StreamingResponse(generator, media_type=media_type, headers=headers)

    @app.get("/api/state", tags=["diagnostics"])
    def api_state(controller: CameraController = Depends(get_controller)) -> dict:
        """Return the controller status used by the UI polling loop.

        Args:
            controller: Injected camera controller instance.

        Returns:
            dict: Controller state.
        """

        return controller.get_state()

    @app.get("/api/logs", tags=["diagnostics"])
    def api_logs(controller: CameraController = Depends(get_controller)) -> dict:
        """Expose the ring buffer log for diagnostics.

        Args:
            controller: Injected camera controller instance.

        Returns:
            dict: Log lines keyed by ``lines``.
        """

        return {"lines": controller.logs()}

    @app.get("/api/start", tags=["control"])
    def api_start(controller: CameraController = Depends(get_controller)) -> dict:
        """Ensure the streaming pipeline is active.

        Args:
            controller: Injected camera controller instance.

        Returns:
            dict: Success payload.
        """

        try:
            controller.start_stream()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {"ok": True}

    @app.get("/api/stop", tags=["control"])
    def api_stop(controller: CameraController = Depends(get_controller)) -> dict:
        """Stop streaming and recording pipelines.

        Args:
            controller: Injected camera controller instance.

        Returns:
            dict: Success payload.
        """

        controller.stop_stream()
        controller.stop_recording()
        return {"ok": True}

    @app.get("/api/pause", tags=["control"])
    def api_pause(controller: CameraController = Depends(get_controller)) -> dict:
        """Pause MJPEG output without destroying the pipeline.

        Args:
            controller: Injected camera controller instance.

        Returns:
            dict: Success payload.
        """

        controller.pause_stream()
        return {"ok": True}

    @app.get("/api/resume", tags=["control"])
    def api_resume(controller: CameraController = Depends(get_controller)) -> dict:
        """Resume a paused MJPEG stream.

        Args:
            controller: Injected camera controller instance.

        Returns:
            dict: Success payload.
        """

        controller.resume_stream()
        return {"ok": True}

    @app.get("/api/flip", tags=["control"])
    def api_flip(
        controller: CameraController = Depends(get_controller),
        h: Optional[int] = Query(None),
        v: Optional[int] = Query(None),
    ) -> dict:
        """Update horizontal/vertical flip settings on the controller.

        Args:
            controller: Injected camera controller instance.
            h: Optional flag to override horizontal flip.
            v: Optional flag to override vertical flip.

        Returns:
            dict: Updated flip status.
        """

        state = controller.get_state()
        current_h = state["hflip"]
        current_v = state["vflip"]
        try:
            new_h = bool(h) if h is not None else current_h
            new_v = bool(v) if v is not None else current_v
            controller.update_flip(hflip=new_h, vflip=new_v)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"ok": True, "hflip": new_h, "vflip": new_v}

    @app.get("/api/snapshot", tags=["media"])
    def api_snapshot(controller: CameraController = Depends(get_controller)) -> dict:
        """Capture a snapshot and return its filename and URL.

        Args:
            controller: Injected camera controller instance.

        Returns:
            dict: Snapshot metadata including ``file`` and ``url``.
        """

        try:
            path = controller.snapshot()
        except RuntimeError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        rel = path.name
        return {"ok": True, "file": rel, "url": f"/snapshots/{rel}"}

    @app.get("/api/snaps", tags=["media"])
    def api_snaps(controller: CameraController = Depends(get_controller)) -> dict:
        """Enumerate available snapshots.

        Args:
            controller: Injected camera controller instance.

        Returns:
            dict: Snapshot filenames.
        """

        return {"files": controller.list_snapshots()}

    @app.post("/api/snaps/clear", tags=["media"])
    def api_snaps_clear(controller: CameraController = Depends(get_controller)) -> dict:
        """Remove all snapshot files from disk.

        Args:
            controller: Injected camera controller instance.

        Returns:
            dict: Deletion summary with ``removed`` count.
        """

        removed = controller.clear_snapshots()
        return {"ok": True, "removed": removed}

    @app.get("/api/videos", tags=["media"])
    def api_videos(controller: CameraController = Depends(get_controller)) -> dict:
        """List recorded video files.

        Args:
            controller: Injected camera controller instance.

        Returns:
            dict: Video filenames.
        """

        return {"files": controller.list_videos()}

    @app.post("/api/videos/clear", tags=["media"])
    def api_videos_clear(controller: CameraController = Depends(get_controller)) -> dict:
        """Delete recorded video files.

        Args:
            controller: Injected camera controller instance.

        Returns:
            dict: Deletion summary with ``removed`` count.
        """

        removed = controller.clear_videos()
        return {"ok": True, "removed": removed}

    @app.get("/api/record", tags=["media"])
    def api_record(cmd: str = Query(""), controller: CameraController = Depends(get_controller)) -> dict:
        """Start or stop recording based on the ``cmd`` query parameter.

        Args:
            cmd: ``start`` or ``stop`` command.
            controller: Injected camera controller instance.

        Returns:
            dict: Recording status payload.
        """

        cmd = cmd.lower()
        if cmd == "start":
            try:
                filename = controller.start_recording()
            except RuntimeError as exc:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
            return {"ok": True, "active": True, "file": filename}
        if cmd == "stop":
            controller.stop_recording()
            return {"ok": True, "active": False, "file": controller.rec_file}
        raise HTTPException(status_code=400, detail="Unsupported command")

    @app.get("/api/config", tags=["control"])
    def api_config(
        controller: CameraController = Depends(get_controller),
        width: Optional[int] = Query(None),
        height: Optional[int] = Query(None),
        fps: Optional[int] = Query(None),
        quality: Optional[int] = Query(None),
    ) -> dict:
        """Fetch or update the controller stream configuration.

        Args:
            controller: Injected camera controller instance.
            width: Optional width override.
            height: Optional height override.
            fps: Optional frames-per-second override.
            quality: Optional JPEG quality override.

        Returns:
            dict: Either the current configuration or an ``ok`` response when updated.
        """

        state = controller.get_state()
        if width is None and height is None and fps is None and quality is None:
            return state["config"]
        try:
            controller.apply_config(
                width=width or state["config"]["width"],
                height=height or state["config"]["height"],
                fps=fps or state["config"]["fps"],
                quality=quality or state["config"]["quality"],
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {"ok": True}

    return app


app = create_app()
