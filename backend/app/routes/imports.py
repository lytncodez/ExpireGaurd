"""CSV import routes"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.csv_service import import_csv

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/csv")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db), user_id: int = 1):
    """Upload and process CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be CSV")
    
    try:
        contents = await file.read()
        result = import_csv(db, contents, user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
