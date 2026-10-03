"""
Password hashing and JWT helpers.

WHY: Passwords are never stored, only Argon2 hashes. JWTs prove "who is
calling" without a database lookup on every request.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import settings

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def create_token(subject: str, expires_minutes: int, extra: dict[str, Any] | None = None) -> str:
    """Build a signed JWT. `subject` is the user id."""
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
        **(extra or {}),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: str, company_id: str, role: str) -> str:
    return create_token(
        user_id,
        settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        {"company_id": company_id, "role": role, "type": "access"},
    )


def create_reset_token(user_id: str) -> str:
    return create_token(user_id, settings.RESET_TOKEN_EXPIRE_MINUTES, {"type": "reset"})


def decode_token(token: str) -> dict[str, Any] | None:
    """Return the payload, or None if invalid/expired (never raises)."""
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
