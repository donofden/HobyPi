"""
System Monitoring API Router

This module provides endpoints for monitoring Raspberry Pi system metrics:
- Health checks
- CPU temperature and throttling status
- Comprehensive system metrics (CPU, memory, disk, network, processes)

All endpoints are public (no authentication required) to allow basic
monitoring even when the authentication system is unavailable.
"""
from fastapi import APIRouter, Query
from app.services.system_metrics import build_temp_payload, build_metrics_payload

# Create router with automatic OpenAPI tags
router = APIRouter()

@router.get("/health", tags=["System"])
def health():
    """
    Basic system health check endpoint.
    
    Returns:
        dict: Simple status indicating the API is responding
    """
    return {"ok": True}

@router.get("/temp", tags=["System"])
def temp():
    """
    Get CPU temperature and throttling status.
    
    Reads temperature from vcgencmd (Raspberry Pi) or thermal zone.
    Also reports any throttling conditions that may affect performance.
    
    Returns:
        dict: Temperature in Celsius, throttling hex value, and decoded flags
    """
    return build_temp_payload()

@router.get("/metrics", tags=["System"])
def metrics(
    sample_ms: int = Query(
        200, 
        ge=0, 
        le=2000, 
        description="CPU sampling window in milliseconds for accurate readings"
    ),
    top_n: int = Query(
        5, 
        ge=0, 
        le=20, 
        description="Number of top processes by CPU usage to return"
    ),
):
    """
    Get comprehensive system metrics.
    
    Provides detailed information about system resource usage including:
    - CPU usage per core and average
    - Memory and swap usage
    - Disk usage for root filesystem
    - Network interface statistics
    - Top processes by CPU usage
    - System load averages
    - Uptime information
    
    Args:
        sample_ms: CPU sampling window in milliseconds (0-2000)
        top_n: Number of top processes to return (0-20)
        
    Returns:
        dict: Comprehensive system metrics with human-readable values
    """
    return build_metrics_payload(sample_ms=sample_ms, top_n=top_n)
