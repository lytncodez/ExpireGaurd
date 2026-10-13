"""Registration, login/logout, password reset, user and company management."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    AuthenticationError,
    BadRequestError,
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
)
from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    create_reset_token,
    decode_token,
    hash_password,
    password_fingerprint,
    password_needs_rehash,
    verify_password,
)
from app.models import AuditAction, Company, RevokedToken, User, UserRole
from app.schemas.auth import RegisterRequest
from app.schemas.company import CompanyUpdate
from app.schemas.user import UserCreate, UserUpdate
from app.services import audit_service
from app.utils.dates import utcnow
from app.utils.pagination import PageParams, paginate

logger = get_logger(__name__)


async def _email_taken(db: AsyncSession, email: str) -> bool:
    return bool(await db.scalar(select(User.id).where(func.lower(User.email) == email.lower())))


async def get_company(db: AsyncSession, company_id: uuid.UUID) -> Company:
    company = await db.get(Company, company_id)
    if company is None:
        raise NotFoundError("Company not found")
    return company


def issue_token(user: User) -> tuple[str, int]:
    token, _, _ = create_access_token(user.id, user.company_id, user.role.value)
    return token, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


REGISTER_LOCK_KEY = 7_311_942  # serialises sign-ups so two "first users" can't both create a pharmacy


async def _create_company(db: AsyncSession, data: RegisterRequest) -> Company:
    company_email = (data.company_email or data.email).lower()
    if await db.scalar(select(Company.id).where(func.lower(Company.email) == company_email)):
        raise ConflictError("A pharmacy with this email already exists")
    company = Company(
        name=(data.company_name or settings.PHARMACY_NAME).strip(),
        email=company_email,
        phone=data.company_phone,
        address=data.company_address,
        currency=data.currency or settings.PHARMACY_CURRENCY,
        timezone=data.timezone or settings.PHARMACY_TIMEZONE,
        critical_days=settings.EXPIRY_CRITICAL_DAYS,
        action_days=settings.EXPIRY_ACTION_DAYS,
        monitor_days=settings.EXPIRY_MONITOR_DAYS,
        advisory_days=settings.EXPIRY_ADVISORY_DAYS,
    )
    db.add(company)
    await db.flush()
    return company


async def register(db: AsyncSession, data: RegisterRequest, ip: str | None) -> tuple[User, Company]:
    """First sign-up creates the pharmacy and its admin; later sign-ups join it as dispensers.

    With ALLOW_MULTIPLE_COMPANIES=true, a sign-up that names a company_name creates a new tenant.
    """
    await db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": REGISTER_LOCK_KEY})
    if await _email_taken(db, data.email):
        raise ConflictError("An account with this email already exists")

    companies = list((await db.scalars(select(Company).order_by(Company.created_at).limit(2))).all())
    creating = not companies or (settings.ALLOW_MULTIPLE_COMPANIES and data.company_name is not None)
    if creating:
        company = await _create_company(db, data)
        role = UserRole.ADMIN
    else:
        if not settings.ALLOW_PUBLIC_SIGNUP:
            raise PermissionDeniedError("Sign-up is closed. Ask your pharmacy admin to create your account.")
        if len(companies) > 1:
            raise BadRequestError("Several pharmacies exist; ask an admin to create your account")
        company = companies[0]
        role = UserRole.DISPENSER

    user = User(
        company_id=company.id,
        name=data.name.strip(),
        email=data.email.lower(),
        phone_number=data.phone_number,
        password_hash=hash_password(data.password),
        role=role,
        is_active=True,
        last_login_at=utcnow(),
    )
    db.add(user)
    await db.flush()
    audit_service.record(
        db,
        action=AuditAction.COMPANY_REGISTERED if creating else AuditAction.USER_CREATED,
        company_id=company.id,
        user_id=user.id,
        entity_type="company" if creating else "user",
        entity_id=company.id if creating else user.id,
        metadata={"self_signup": True, "role": role.value},
        ip_address=ip,
    )
    await db.commit()
    await db.refresh(user)
    return user, company


async def authenticate(db: AsyncSession, email: str, password: str, ip: str | None) -> User:
    user = await db.scalar(select(User).where(func.lower(User.email) == email.lower()))
    if user is None or not verify_password(password, user.password_hash):
        raise AuthenticationError("Invalid email or password")
    if not user.is_active:
        raise AuthenticationError("This account is disabled")
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    user.last_login_at = utcnow()
    audit_service.record(
        db, action=AuditAction.USER_LOGIN, company_id=user.company_id, user_id=user.id,
        entity_type="user", entity_id=user.id, ip_address=ip,
    )
    await db.commit()
    return user


async def logout(db: AsyncSession, user: User, payload: dict, ip: str | None) -> None:
    expires_at = datetime.fromtimestamp(int(payload["exp"]), tz=timezone.utc)
    if not await db.get(RevokedToken, payload["jti"]):
        db.add(RevokedToken(jti=payload["jti"], user_id=user.id, expires_at=expires_at))
    audit_service.record(
        db, action=AuditAction.USER_LOGOUT, company_id=user.company_id, user_id=user.id,
        entity_type="user", entity_id=user.id, ip_address=ip,
    )
    await db.commit()


async def forgot_password(db: AsyncSession, email: str, ip: str | None) -> str | None:
    """Create a reset token. The response is identical whether or not the email exists."""
    user = await db.scalar(select(User).where(func.lower(User.email) == email.lower()))
    if user is None or not user.is_active:
        return None
    token = create_reset_token(user.id, user.password_hash)
    audit_service.record(
        db, action=AuditAction.PASSWORD_RESET_REQUESTED, company_id=user.company_id, user_id=user.id,
        entity_type="user", entity_id=user.id, ip_address=ip,
    )
    await db.commit()
    if user.phone_number:
        # Deliver via the SMS channel (mock mode just logs it). Never fail the request on delivery.
        from app.services.sms_service import send_sms

        result = await send_sms(
            user.phone_number,
            f"ExpireGuard password reset code (valid {settings.RESET_TOKEN_EXPIRE_MINUTES} min): {token}",
        )
        if not result.success:
            logger.warning("Password reset SMS failed for user %s: %s", user.id, result.error)
    return token


async def reset_password(db: AsyncSession, token: str, new_password: str, ip: str | None) -> None:
    payload = decode_token(token, expected_type="reset")
    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError as exc:
        raise AuthenticationError("Invalid token") from exc
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise AuthenticationError("Invalid token")
    if payload.get("pwf") != password_fingerprint(user.password_hash):
        raise AuthenticationError("This reset token has already been used")
    user.password_hash = hash_password(new_password)
    audit_service.record(
        db, action=AuditAction.PASSWORD_RESET, company_id=user.company_id, user_id=user.id,
        entity_type="user", entity_id=user.id, ip_address=ip,
    )
    await db.commit()


# --------------------------------------------------------------------------- users


async def list_users(db: AsyncSession, company_id: uuid.UUID, params: PageParams) -> tuple[list[User], int]:
    stmt = select(User).where(User.company_id == company_id).order_by(User.created_at)
    return await paginate(db, stmt, params)


async def get_user(db: AsyncSession, company_id: uuid.UUID, user_id: uuid.UUID) -> User:
    user = await db.scalar(select(User).where(User.id == user_id, User.company_id == company_id))
    if user is None:
        raise NotFoundError("User not found")
    return user


def temporary_password() -> str:
    """Readable temporary password that satisfies the password policy (letters + digits)."""
    import secrets

    return f"Tmp{secrets.token_hex(3)}{secrets.randbelow(90) + 10}"


async def create_user(db: AsyncSession, actor: User, data: UserCreate, ip: str | None) -> tuple[User, str | None]:
    """Returns (user, temporary_password or None)."""
    if await _email_taken(db, data.email):
        raise ConflictError("An account with this email already exists")
    temp = None if data.password else temporary_password()
    user = User(
        company_id=actor.company_id,
        name=data.name.strip(),
        email=data.email.lower(),
        phone_number=data.phone_number,
        password_hash=hash_password(data.password or temp),
        role=data.role,
    )
    db.add(user)
    await db.flush()
    audit_service.record(
        db, action=AuditAction.USER_CREATED, company_id=actor.company_id, user_id=actor.id,
        entity_type="user", entity_id=user.id, metadata={"role": data.role.value}, ip_address=ip,
    )
    await db.commit()
    await db.refresh(user)
    return user, temp


async def _guard_last_admin(db: AsyncSession, actor: User, user: User) -> None:
    if user.role != UserRole.ADMIN or not user.is_active:
        return
    admins = await db.scalar(
        select(func.count()).select_from(User).where(
            User.company_id == actor.company_id, User.role == UserRole.ADMIN, User.is_active.is_(True)
        )
    )
    if (admins or 0) <= 1:
        raise BadRequestError("A pharmacy must keep at least one active admin")


async def delete_user(db: AsyncSession, actor: User, user_id: uuid.UUID, ip: str | None) -> None:
    user = await get_user(db, actor.company_id, user_id)
    if user.id == actor.id:
        raise BadRequestError("You cannot remove your own account")
    await _guard_last_admin(db, actor, user)
    audit_service.record(
        db, action=AuditAction.USER_DELETED, company_id=actor.company_id, user_id=actor.id,
        entity_type="user", entity_id=user.id, metadata={"email": user.email}, ip_address=ip,
    )
    await db.delete(user)
    await db.commit()


async def update_user(db: AsyncSession, actor: User, user_id: uuid.UUID, data: UserUpdate, ip: str | None) -> User:
    user = await get_user(db, actor.company_id, user_id)
    changes = data.model_dump(exclude_unset=True)
    demoting = "role" in changes and changes["role"] != UserRole.ADMIN and user.role == UserRole.ADMIN
    deactivating = changes.get("is_active") is False and user.is_active
    if user.id == actor.id and (demoting or deactivating):
        raise BadRequestError("You cannot demote or deactivate your own account")
    if demoting or deactivating:
        await _guard_last_admin(db, actor, user)
    for field, value in changes.items():
        setattr(user, field, value)
    audit_service.record(
        db, action=AuditAction.USER_UPDATED, company_id=actor.company_id, user_id=actor.id,
        entity_type="user", entity_id=user.id,
        metadata={k: (v.value if hasattr(v, "value") else v) for k, v in changes.items()}, ip_address=ip,
    )
    await db.commit()
    await db.refresh(user)
    return user


# --------------------------------------------------------------------------- company


async def update_company(db: AsyncSession, actor: User, data: CompanyUpdate, ip: str | None) -> Company:
    company = await get_company(db, actor.company_id)
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        if field in {"name", "currency", "timezone"} and value is None:
            continue
        setattr(company, field, value)
    company.updated_at = utcnow()
    audit_service.record(
        db, action=AuditAction.COMPANY_UPDATED, company_id=company.id, user_id=actor.id,
        entity_type="company", entity_id=company.id, metadata=changes, ip_address=ip,
    )
    await db.commit()
    await db.refresh(company)
    return company
