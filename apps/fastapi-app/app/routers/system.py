"""
System Monitoring API Router

This module provides endpoints for monitoring Raspberry Pi system metrics:
- Health checks
- CPU temperature and throttling status
- Comprehensive system metrics (CPU, memory, disk, network, processes)

All endpoints require authentication with appropriate scopes:
- system:read - Required for all system monitoring endpoints
- admin - Administrative access (includes all system permissions)
"""
from fastapi import APIRouter, Query, Depends, Security
from fastapi.security import SecurityScopes
from app.services.system_metrics import build_temp_payload, build_metrics_payload
from app.core.security import get_current_user
from app.models.user import User

# Create router with automatic OpenAPI tags
router = APIRouter()

@router.get("/health", tags=["System Monitoring"])
def health(
    current_user: User = Security(get_current_user, scopes=["system:read"])
):
    """
    Basic system health check endpoint.
    
    Requires: system:read scope
    
    Returns:
        dict: Simple status indicating the API is responding
    """
    return {"ok": True, "user": current_user.username}

@router.get("/temp", tags=["System Monitoring"])
def temp(
    current_user: User = Security(get_current_user, scopes=["system:read"])
):
    """
    Get CPU temperature and throttling information.
    
    Requires: system:read scope
    
    Returns detailed information about:
    - Current CPU temperature in Celsius
    - Throttling status including undervoltage, frequency capping, thermal limits
    - Historical flags showing if any throttling has occurred since boot
    
    Returns:
        dict: Temperature and throttling status information
    """
    return build_temp_payload()

@router.get("/metrics", tags=["System Monitoring"])
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
    current_user: User = Security(get_current_user, scopes=["system:read"])
):
    """
    Get comprehensive system metrics.
    
    Requires: system:read scope
    
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
