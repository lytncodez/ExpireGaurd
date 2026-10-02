"""Authentication routes"""

from typing import Any

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.services.auth_service import create_user, authenticate_user, get_user_by_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register new user"""
    # Check if user exists
    existing = get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Create user
    user = create_user(db, user_data)
    return user


@router.post("/login")
async def login(
    request: Request,
    db: Session = Depends(get_db),
    username: str | None = Form(default=None),
    password: str | None = Form(default=None),
):
    """Login and get access token"""
    email = username
    password_value = password

    if email is None or password_value is None:
        try:
            data = await request.json()
        except Exception:
            data = {}
        email = data.get("email") or email
        password_value = data.get("password") or password_value

    if not email or not password_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user = authenticate_user(db, email, password_value)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create token
    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Get the authenticated user profile."""
    return current_user


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Logout endpoint for clients that clear the token locally."""
    return {"message": "Logged out successfully", "user_id": current_user.id}
