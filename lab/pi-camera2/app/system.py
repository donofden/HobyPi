"""System helpers to free the Raspberry Pi camera pipeline."""
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Callable, Iterable, Optional, Sequence, Set

LogFn = Optional[Callable[[str], None]]


def _log(logger: LogFn, message: str) -> None:
    """Invoke the provided logger callable if present.

    Args:
        logger: Optional callable that accepts a string message.
        message: Textual details to forward.

    Returns:
        None
    """

    if logger:
        logger(message)


def run(cmd: Sequence[str], **kwargs) -> subprocess.CompletedProcess:
    """Run a command and capture stdout/stderr.

    Args:
        cmd: Command and arguments to execute.
        **kwargs: Extra ``subprocess.run`` keyword arguments.

    Returns:
        subprocess.CompletedProcess: Execution result with captured output.
    """
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, **kwargs)


PIPEWIRE_SERVICES = ("pipewire", "pipewire-pulse", "wireplumber")
PIPEWIRE_SOCKETS = ("pipewire.socket", "pipewire-pulse.socket")
DEFAULT_CAMERA_DEVICES = ("/dev/media0", "/dev/video0")


def stop_pipewire_stack(logger: LogFn = None) -> None:
    """Stop desktop PipeWire services so libcamera can claim the device.

    Args:
        logger: Optional logger for progress updates.

    Returns:
        None
    """

    _log(logger, "Stopping PipeWire stack")
    for svc in PIPEWIRE_SERVICES:
        run(["systemctl", "--user", "stop", svc])
    for sock in PIPEWIRE_SOCKETS:
        run(["systemctl", "--user", "stop", sock])
    run(["pkill", "-f", "^pipewire( |$)"])
    run(["pkill", "-f", "^wireplumber( |$)"])


def start_pipewire_stack(logger: LogFn = None) -> None:
    """Start desktop PipeWire services after camera tests complete.

    Args:
        logger: Optional logger for progress updates.

    Returns:
        None
    """

    _log(logger, "Starting PipeWire stack")
    for sock in PIPEWIRE_SOCKETS:
        run(["systemctl", "--user", "start", sock])
    for svc in PIPEWIRE_SERVICES:
        run(["systemctl", "--user", "start", svc])


def pids_holding_camera(devices: Sequence[str] = DEFAULT_CAMERA_DEVICES, logger: LogFn = None) -> Set[int]:
    """Return PIDs currently holding open the given camera device nodes.

    Args:
        devices: Paths to query for open handles.
        logger: Optional logger for diagnostics.

    Returns:
        Set[int]: Process identifiers that currently hold the devices.
    """

    pids: Set[int] = set()
    for device in devices:
        if not Path(device).exists():
            continue
        result = run(["lsof", device])
        if result.returncode != 0:
            continue
        for line in result.stdout.splitlines():
            parts = line.split()
            if len(parts) >= 2 and parts[1].isdigit():
                pids.add(int(parts[1]))
    if pids:
        _log(logger, f"Processes holding camera devices: {sorted(pids)}")
    return pids


def kill_pids(pids: Iterable[int], logger: LogFn = None) -> None:
    """Terminate user-owned processes that conflict with the camera.

    Args:
        pids: Process identifiers that should be terminated.
        logger: Optional logger for progress updates.

    Returns:
        None
    """

    my_uid = os.getuid()
    victims = list(pids)
    for sig in (signal.SIGTERM, signal.SIGKILL):
        for pid in list(victims):
            try:
                if os.stat(f"/proc/{pid}").st_uid == my_uid:
                    os.kill(pid, sig)
                    _log(logger, f"Sent {sig.name} to PID {pid}")
            except FileNotFoundError:
                victims.remove(pid)
            except PermissionError:
                _log(logger, f"Cannot signal PID {pid}; insufficient permissions")
        time.sleep(0.2)


def free_camera(logger: LogFn = None, *, manage_pipewire: bool = True, devices: Sequence[str] = DEFAULT_CAMERA_DEVICES) -> None:
    """Ensure the camera device nodes are free for Picamera2 use.

    Args:
        logger: Optional logger for status output.
        manage_pipewire: Whether to stop PipeWire services automatically.
        devices: Device nodes to inspect and free.

    Returns:
        None
    """

    if manage_pipewire:
        stop_pipewire_stack(logger)
    holders = pids_holding_camera(devices, logger)
    if holders:
        kill_pids(holders, logger)
    remaining = pids_holding_camera(devices, logger)
    if remaining:
        msg = "Camera still busy: %s" % sorted(remaining)
        _log(logger, msg)
        print(msg)
        print("Run: sudo fuser -k /dev/video* /dev/media*")
        sys.exit(1)


def resume_desktop_services(logger: LogFn = None) -> None:
    """Restart PipeWire services after camera testing is finished.

    Args:
        logger: Optional logger for status output.

    Returns:
        None
    """

    start_pipewire_stack(logger)


if __name__ == "__main__":
    from .config import load_settings
    settings = load_settings()
    free_camera(logger=print, manage_pipewire=settings.manage_pipewire)
    print("Camera resources released.")
