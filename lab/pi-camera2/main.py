"""Entry point for the Pi Camera FastAPI service."""
from __future__ import annotations

import argparse
import socket

import uvicorn

from app import create_app, load_settings
from app.system import free_camera, resume_desktop_services


def _port_in_use(host: str, port: int) -> bool:
    """Return True when a TCP server is already bound to host:port.

    Args:
        host: Desired bind host used by uvicorn.
        port: Desired TCP port.

    Returns:
        bool: ``True`` if the port already has a listener, ``False`` otherwise.
    """

    check_host = "127.0.0.1" if host in {"0.0.0.0", "::", ""} else host
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        result = sock.connect_ex((check_host, port))
    return result == 0

def parse_args() -> argparse.Namespace:
    """Parse CLI options for the camera utility entrypoint.

    Returns:
        argparse.Namespace: Parsed arguments from ``sys.argv``.
    """

    parser = argparse.ArgumentParser(description="Pi Camera control service")
    parser.add_argument(
        "command",
        nargs="?",
        default="serve",
        choices=["serve", "free-camera", "resume-desktop"],
        help="Action to perform",
    )
    parser.add_argument("--host", default=None, help="Override bind host")
    parser.add_argument("--port", type=int, default=None, help="Override bind port")
    parser.add_argument("--reload", action="store_true", help="Enable FastAPI auto-reload")
    return parser.parse_args()


def main() -> None:
    """Dispatch CLI commands for camera control and server startup.

    Returns:
        None
    """

    args = parse_args()
    settings = load_settings()

    if args.command == "free-camera":
        free_camera(logger=print, manage_pipewire=settings.manage_pipewire)
        return
    if args.command == "resume-desktop":
        resume_desktop_services(logger=print)
        return

    host = args.host or settings.host
    port = args.port or settings.port
    if _port_in_use(host, port):
        display_host = '127.0.0.1' if host in {'0.0.0.0', '::', ''} else host
        print(
            f'Port {port} is already in use on {display_host}. '
            'Set PI_CAMERA_PORT or pass --port to select a different port.'
        )
        return

    app = create_app(settings)
    uvicorn.run(app, host=host, port=port, reload=args.reload)


if __name__ == "__main__":
    main()
