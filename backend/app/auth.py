from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.exc import UnknownHashError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from . import models, schemas
from .database import get_db
from .config import settings
import hashlib
import logging


# Initialize password hashing context.
# Prefer bcrypt but gracefully fall back to pbkdf2_sha256 if the bcrypt backend is not available
import logging
logger = logging.getLogger(__name__)

try:
    # Try to create a CryptContext that prefers bcrypt but can verify pbkdf2_sha256 as well
    pwd_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256"], deprecated="auto", bcrypt__rounds=12)
    # quick runtime sanity check: attempt to hash a tiny secret to ensure bcrypt backend is usable
    try:
        _ = pwd_context.hash("test")
    except Exception as _e:
        # If hashing fails, we'll fall back below
        raise _e
except Exception as e:
    # If bcrypt backend/module is missing or broken (common on some platforms), fall back to pbkdf2_sha256
    logger.warning("bcrypt backend unavailable or broken, falling back to pbkdf2_sha256: %s", e)
    pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    # Truncate password if too long (bcrypt limit is 72 bytes)
    if len(plain_password.encode('utf-8')) > 72:
        plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    # Truncate password if too long (bcrypt limit is 72 bytes)
    if len(password.encode('utf-8')) > 72:
        # Hash the password first if it's too long, then use first 72 chars
        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
        password = password_hash[:72]
    return pwd_context.hash(password)

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_refresh_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise JWTError("Invalid token type")
        email: str = payload.get("sub")
        if email is None:
            raise JWTError("No subject in token")
        return email
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_user(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def authenticate_user(db: Session, email: str, password: str):
    user = get_user(db, email)
    if not user:
        return False
    try:
        if not verify_password(password, user.hashed_password):
            return False
    except UnknownHashError as e:
        # Hash format ไม่รู้จัก (เช่น bcrypt hash แต่ bcrypt backend ไม่พร้อม)
        logger.warning(f"Unknown hash format for user {email}: {e}")
        return False
    except Exception as e:
        # Error อื่นๆ ในการ verify password
        logger.error(f"Password verification error for user {email}: {e}")
        return False
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = get_user(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    # is_active check removed - all users are active by default
    return current_user 