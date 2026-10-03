"""Tests for core/ files: config, security, exceptions, logging, db dependency, app boot."""
import jwt
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.exceptions import (
    AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError,
    ValidationFailedError, register_exception_handlers,
)
from app.core.security import (
    create_access_token, create_reset_token, create_token, decode_token,
    hash_password, verify_password,
)
from app.dependencies.database import get_db


# ---------- config ----------
def test_expiry_thresholds_default_to_spec():
    s = Settings()
    assert s.EXPIRY_CRITICAL_DAYS == 30
    assert s.EXPIRY_SOON_DAYS == 90


def test_cors_origins_are_split_and_trimmed():
    s = Settings(CORS_ORIGINS="http://a.com, http://b.com ,")
    assert s.cors_origins_list == ["http://a.com", "http://b.com"]


def test_upload_limit_converted_to_bytes():
    assert Settings(MAX_UPLOAD_MB=2).max_upload_bytes == 2 * 1024 * 1024


def test_too_short_jwt_secret_rejected():
    with pytest.raises(ValidationError):
        Settings(JWT_SECRET_KEY="short")


def test_sms_and_ai_default_to_mock():
    s = Settings()
    assert s.SMS_MODE == "mock"
    assert s.AI_PROVIDER == "mock"


# ---------- passwords ----------
def test_password_hash_is_not_plaintext_and_verifies():
    h = hash_password("S3cret!pass")
    assert h != "S3cret!pass"
    assert verify_password("S3cret!pass", h) is True


def test_wrong_password_rejected():
    assert verify_password("wrong", hash_password("right")) is False


def test_garbage_hash_does_not_crash():
    assert verify_password("anything", "not-a-real-hash") is False


def test_same_password_gives_different_hashes():
    assert hash_password("same") != hash_password("same")  # random salt


# ---------- JWT ----------
def test_access_token_round_trip():
    token = create_access_token("user-1", "company-1", "ADMIN")
    payload = decode_token(token)
    assert payload["sub"] == "user-1"
    assert payload["company_id"] == "company-1"
    assert payload["role"] == "ADMIN"
    assert payload["type"] == "access"


def test_reset_token_has_reset_type():
    assert decode_token(create_reset_token("user-1"))["type"] == "reset"


def test_expired_token_returns_none():
    assert decode_token(create_token("u", expires_minutes=-1)) is None


def test_tampered_token_returns_none():
    token = create_access_token("u", "c", "STAFF")
    assert decode_token(token[:-3] + "abc") is None


def test_token_signed_with_other_secret_returns_none():
    forged = jwt.encode({"sub": "u"}, "some-other-secret-key", algorithm="HS256")
    assert decode_token(forged) is None


def test_garbage_token_returns_none():
    assert decode_token("not.a.jwt") is None


# ---------- exceptions ----------
def _app_with_errors() -> FastAPI:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/notfound")
    async def notfound():
        raise NotFoundError("Product not found")

    @app.get("/boom")
    async def boom():
        raise RuntimeError("secret database password leaked")

    @app.get("/details")
    async def details():
        raise ValidationFailedError("Bad row", {"row": 4})

    return app


@pytest.mark.parametrize("exc,status,code", [
    (NotFoundError, 404, "NOT_FOUND"),
    (ConflictError, 409, "CONFLICT"),
    (UnauthorizedError, 401, "UNAUTHORIZED"),
    (ForbiddenError, 403, "FORBIDDEN"),
    (ValidationFailedError, 422, "VALIDATION_ERROR"),
    (AppError, 400, "BAD_REQUEST"),
])
def test_exception_status_and_code(exc, status, code):
    assert exc.status_code == status
    assert exc.code == code


async def test_app_error_becomes_clean_json():
    transport = ASGITransport(app=_app_with_errors())
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/notfound")
    assert r.status_code == 404
    assert r.json() == {"error": {"code": "NOT_FOUND", "message": "Product not found", "details": None}}


async def test_error_details_are_returned():
    transport = ASGITransport(app=_app_with_errors())
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/details")
    assert r.json()["error"]["details"] == {"row": 4}


async def test_unexpected_error_hides_internals():
    transport = ASGITransport(app=_app_with_errors(), raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.get("/boom")
    assert r.status_code == 500
    assert "secret" not in r.text
    assert r.json()["error"]["code"] == "INTERNAL_ERROR"


# ---------- db dependency ----------
async def test_get_db_yields_a_session():
    async for session in get_db():
        assert isinstance(session, AsyncSession)


# ---------- app boot ----------
async def test_main_app_boots_and_allows_configured_cors_origin():
    from app.main import app

    assert app.title == settings.APP_NAME
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.options(
            "/anything",
            headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"},
        )
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


async def test_main_app_blocks_unknown_cors_origin():
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.options(
            "/anything",
            headers={"Origin": "http://evil.com", "Access-Control-Request-Method": "GET"},
        )
    assert "access-control-allow-origin" not in r.headers
