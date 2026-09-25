"""
Security utilities for authentication.

Two main functions:
1. Password hashing (bcrypt)
2. JWT token creation and verification
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings

# Password hashing context (bcrypt algorithm)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.
    
    Why: Never store plaintext passwords. Hash them so only the user
    knows their password.
    
    Example:
        hashed = hash_password("mypassword123")
        # Returns: $2b$12$abc123xyz... (different every time)
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a bcrypt hash.
    
    Returns True if the password matches, False otherwise.
    
    Example:
        is_valid = verify_password("mypassword123", hashed_from_db)
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload to encode (e.g., {"sub": user_id})
        expires_delta: How long the token is valid. If None, uses default.
    
    Returns:
        Encoded JWT string.
    
    Example:
        token = create_access_token({"sub": "user_123"})
        # Returns: eyJhbGciOiJIUzI1NiIs... (encoded JWT)
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm,
    )
    
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT token.
    
    Returns the payload if valid, None if invalid or expired.
    
    Why: Before letting a user access protected endpoints, we need to
    verify their token is genuine and not expired.
    
    Example:
        payload = decode_token(token_from_header)
        if payload:
            user_id = payload.get("sub")
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        return payload
    except JWTError:
        return None
