from fastapi import APIRouter, Query
from app.services.system_metrics import build_temp_payload, build_metrics_payload

router = APIRouter()

@router.get("/health", tags=["System"])
def health():
    return {"ok": True}

@router.get("/temp", tags=["System"])
def temp():
    return build_temp_payload()

@router.get("/metrics", tags=["System"])
def metrics(
    sample_ms: int = Query(200, ge=0, le=2000, description="CPU sample window in ms"),
    top_n: int = Query(5, ge=0, le=20, description="Top N processes by CPU"),
):
    return build_metrics_payload(sample_ms=sample_ms, top_n=top_n)
