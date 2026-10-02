"""
ExpireGuard Backend API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .routes import alerts, auth, batches, dashboard, expiry, imports, insights, products

# Initialize FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Product expiry tracking and alert system",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/", tags=["Health"])
def root():
    return {
        "message": f"Welcome to {settings.app_name}",
        "status": "ok",
        "docs": "/docs",
    }

# Include routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(batches.router)
app.include_router(alerts.router)
app.include_router(expiry.router)
app.include_router(imports.router)
app.include_router(dashboard.router)
app.include_router(insights.router)