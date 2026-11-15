"""FastAPI application entry-point for the Xongket backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Integrated Rural Disaster Management System for Assam — IoT, AI & Cloud",
)

# Allow the Next.js dashboard during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Liveness probe — returns 200 when the server is up."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": "0.1.0",
    }

