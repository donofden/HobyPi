"""
HobyPi FastAPI Application - Main Entry Point

This module creates and configures the FastAPI application with:
- CORS middleware for cross-origin requests
- Authentication and user management routers
- System monitoring endpoints
- Database initialization and bootstrapping

The application automatically:
1. Runs database migrations on startup
2. Seeds default roles and admin user
3. Enables comprehensive API documentation
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.bootstrap import bootstrap_on_startup
from app.routers import system, auth, users

def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Returns:
        FastAPI: Configured application instance
    """
    app = FastAPI(
        title=settings.app_name, 
        version=settings.version,
        description="HobyPi API with authentication, user management, and system monitoring",
        docs_url="/docs",  # Swagger UI
        redoc_url="/redoc"  # ReDoc documentation
    )

    # Configure CORS middleware for development
    # Note: In production, restrict origins to specific domains
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routers
    app.include_router(system.router, prefix="/system", tags=["System Monitoring"])
    app.include_router(auth.router, tags=["Authentication"])
    app.include_router(users.router, tags=["User Management"])

    @app.on_event("startup")
    async def _on_startup():
        """
        Application startup event handler.
        
        Performs database migrations and initial data seeding.
        """
        await bootstrap_on_startup()

    @app.get("/", tags=["Health"])
    def root():
        """
        Root endpoint for basic health check and API information.
        
        Returns:
            dict: API name, version, and status
        """
        return {
            "app": settings.app_name, 
            "version": settings.version, 
            "ok": True,
            "docs": "/docs",
            "redoc": "/redoc"
        }

    return app

# Create application instance
app = create_app()
