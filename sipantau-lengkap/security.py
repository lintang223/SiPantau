import os
import bcrypt
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import Request, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

JWT_SECRET      = os.getenv("JWT_SECRET", "sipantau-dev-secret-GANTI-DI-PRODUKSI")
JWT_ALGORITHM   = "HS256"
JWT_EXPIRE_HRS  = int(os.getenv("JWT_EXPIRE_HOURS", "12"))

security = HTTPBearer(auto_error=False)

DIVISI_LEVEL = {
    "sekditjen": 1,
    "dit_ppsa":  2,
    "gakkum_sumatra": 3,
    "gakkum_jabalnusra": 3,
    "gakkum_kalimantan": 3,
    "gakkum_sulawesi": 3,
    "gakkum_malupapua": 3,
    "balai_gakkum": 3,
}
DIVISI_COLOR = {
    "sekditjen": "#7c3aed",
    "dit_ppsa":  "#0d9488",
    "gakkum_sumatra": "#2563eb",
    "gakkum_jabalnusra": "#0284c7",
    "gakkum_kalimantan": "#10b981",
    "gakkum_sulawesi": "#d97706",
    "gakkum_malupapua": "#6366f1",
    "balai_gakkum": "#2563eb",
}

def hash_pw(plain: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode('utf-8'), salt).decode('utf-8')

def verify_pw(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        sha = hashlib.sha256(plain.encode('utf-8')).hexdigest()
        return sha == hashed

def create_token(username: str, divisi: str, level: int) -> str:
    payload = {
        "sub":    username,
        "divisi": divisi,
        "level":  level,
        "exp":    datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HRS),
        "iat":    datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.cookies.get("sipantau_token")
        
    if not token:
        raise HTTPException(status_code=401, detail="Token tidak valid atau sudah kadaluarsa. Silakan login ulang.")
        
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Token tidak valid")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token tidak valid atau sudah kadaluarsa. Silakan login ulang.")

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("level", 99) > 2:
        raise HTTPException(status_code=403, detail="Akses ditolak. Hanya admin yang diizinkan.")
    return current_user

def require_superadmin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("level", 99) > 1:
        raise HTTPException(status_code=403, detail="Akses ditolak. Hanya superadmin yang diizinkan.")
    return current_user

def validate_password_complexity(password: str, username: str = "") -> str:
    if len(password) < 8:
        return "Password minimal 8 karakter"
    has_letter = any(c.isalpha() for c in password)
    has_digit  = any(c.isdigit() for c in password)
    if not has_letter:
        return "Password harus mengandung minimal 1 huruf"
    if not has_digit:
        return "Password harus mengandung minimal 1 angka"
    if username and password.lower() == username.lower():
        return "Password tidak boleh sama dengan username"
    return ""

def get_accessible_divisi(conn, user_divisi: str) -> List[str]:
    lvl = DIVISI_LEVEL.get(user_divisi, 99)
    if lvl == 1:
        return list(DIVISI_LEVEL.keys())
    cur = conn.cursor()
    cur.execute(
        "SELECT divisi_target FROM divisi_access WHERE divisi_asal = %s AND can_view = TRUE",
        (user_divisi,)
    )
    result = [r["divisi_target"] for r in cur.fetchall()]
    cur.close()
    if lvl <= 2 and user_divisi not in result and user_divisi in DIVISI_LEVEL:
        result.insert(0, user_divisi)
    return result
