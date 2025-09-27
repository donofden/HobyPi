from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import system

def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.version)

    # CORS (open for LAN dev; restrict later if needed)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(system.router, prefix="/system")

    return app

app = create_app()
