"""
ExpireGuard Backend - Entry Point
"""
import sys
from pathlib import Path

# Add backend directory to Python path
sys.path.insert(0, str(Path(_file_).parent))

if _name_ == "_main_":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )