from fastapi import APIRouter, Request, Response, Depends, HTTPException
import logging
import os

from database import get_conn
from security import get_current_user, create_token, verify_pw, hash_pw, DIVISI_LEVEL, DIVISI_COLOR, JWT_EXPIRE_HRS, get_accessible_divisi, validate_password_complexity
from schemas import LoginRequest, ChangePasswordRequest, UpdateProfilRequest, UpdateFotoRequest
from utils import get_lockout_remaining, check_rate_limit, log_login, clear_attempts, log_user_activity, validate_input, count_failed_attempts

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger("sipantau")

def get_client_ip(request: Request) -> str:
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()
    x_forwarded = request.headers.get("X-Forwarded-For")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"

@router.get("/lockout-status")
def lockout_status(request: Request = None):
    return {"locked": False, "remaining_seconds": 0}

@router.post("/login")
def login(req: LoginRequest, request: Request, response: Response):
    ip         = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")
    username_clean = req.username.strip().lstrip('@')
    
    validate_input(username_clean, "Username", max_length=50)
    if not (1 <= len(req.password) <= 100):
        raise HTTPException(status_code=400, detail="Password tidak valid")

    try:
        check_rate_limit(ip=ip)
    except HTTPException as e:
        with get_conn() as conn:
            log_login(conn, username_clean, ip, user_agent, "blocked", e.detail)
            conn.commit()
        raise e

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s AND deleted_at IS NULL", (username_clean,))
        user = cur.fetchone()
        cur.close()

    if not user or not verify_pw(req.password, user["password"]):
        detail_msg = "Username tidak ditemukan atau dinonaktifkan" if not user else "Password salah."
        logger.warning(f"Login gagal untuk username '{username_clean}' dari IP {ip}")
        with get_conn() as conn:
            log_login(conn, username_clean, ip, user_agent, "failed", detail_msg)
            conn.commit()
        raise HTTPException(status_code=401, detail=detail_msg)

    clear_attempts(ip=ip)
    divisi = user.get("divisi") or "balai_gakkum"
    level  = user.get("level") or DIVISI_LEVEL.get(divisi, 3)
    token  = create_token(user["username"], divisi, level)

    with get_conn() as conn:
        accessible = get_accessible_divisi(conn, divisi)
        log_user_activity(conn, username_clean, "Login", "User berhasil login", ip)
        log_login(conn, username_clean, ip, user_agent, "success", "Login berhasil")
        conn.commit()

    logger.info(f"Login berhasil: {username_clean} dari IP {ip}")
    
    is_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    samesite_policy = "none" if is_secure else "lax"
    response.set_cookie(
        key="sipantau_token",
        value=token,
        httponly=True,
        max_age=JWT_EXPIRE_HRS * 3600,
        samesite=samesite_policy,
        secure=is_secure,
    )

    return {
        "success": True,
        "user": {
            "username":          user["username"],
            "nama":              user["nama"],
            "divisi":            divisi,
            "level":             level,
            "can_export":        bool(user.get("can_export", True)),
            "can_manage_users":  bool(user.get("can_manage_users", False)),
            "accessible_divisi": accessible,
            "divisi_color":      DIVISI_COLOR.get(divisi, "#374151"),
        }
    }

@router.post("/logout")
def logout(response: Response):
    is_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    samesite_policy = "none" if is_secure else "lax"
    response.delete_cookie(key="sipantau_token", path="/", samesite=samesite_policy, secure=is_secure)
    return {"success": True, "message": "Berhasil logout"}

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    username = current_user["sub"]
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cur.fetchone()
        if not user:
            cur.close()
            raise HTTPException(status_code=404, detail="User tidak ditemukan")
        divisi     = user.get("divisi") or "balai_gakkum"
        level      = user.get("level") or DIVISI_LEVEL.get(divisi, 3)
        accessible = get_accessible_divisi(conn, divisi)
        cur.close()
    return {
        "success": True,
        "user": {
            "username":          user["username"],
            "nama":              user["nama"],
            "divisi":            divisi,
            "level":             level,
            "can_export":        bool(user.get("can_export", True)),
            "can_manage_users":  bool(user.get("can_manage_users", False)),
            "accessible_divisi": accessible,
            "divisi_color":      DIVISI_COLOR.get(divisi, "#374151"),
            "foto_profil":       user.get("foto_profil"),
        }
    }

@router.post("/ganti-password")
def ganti_password(req: ChangePasswordRequest, request: Request, current_user: dict = Depends(get_current_user)):
    ip = request.client.host if request.client else "unknown"
    if current_user["sub"] != req.username:
        raise HTTPException(status_code=403, detail="Tidak bisa ganti password user lain")
    err = validate_password_complexity(req.password_baru, req.username)
    if err:
        raise HTTPException(status_code=400, detail=err)

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s", (req.username,))
        user = cur.fetchone()
        if not user or not verify_pw(req.password_lama, user["password"]):
            cur.close()
            raise HTTPException(status_code=401, detail="Password lama salah")
        cur.execute(
            "UPDATE users SET password=%s WHERE username=%s",
            (hash_pw(req.password_baru), req.username)
        )
        log_user_activity(conn, req.username, "Ganti Password", "User mengubah password miliknya", ip)
        conn.commit()
        cur.close()
    return {"success": True, "message": "Password berhasil diubah"}

@router.put("/update-profil")
def update_profil(req: UpdateProfilRequest, request: Request, current_user: dict = Depends(get_current_user)):
    username = current_user["sub"]
    ip = request.client.host if request.client else "unknown"
    nama_bersih = req.nama.strip()
    if not nama_bersih:
        raise HTTPException(status_code=400, detail="Nama tidak boleh kosong")
    if len(nama_bersih) > 100:
        raise HTTPException(status_code=400, detail="Nama terlalu panjang (maks 100 karakter)")

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE users SET nama=%s WHERE username=%s", (nama_bersih, username))
        if cur.rowcount == 0:
            cur.close()
            raise HTTPException(status_code=404, detail="User tidak ditemukan")
        cur.execute("SELECT * FROM users WHERE username=%s", (username,))
        user = cur.fetchone()
        divisi = user.get("divisi") or "balai_gakkum"
        level  = user.get("level") or DIVISI_LEVEL.get(divisi, 3)
        accessible = get_accessible_divisi(conn, divisi)
        log_user_activity(conn, username, "Update Profil", f"Nama diubah menjadi '{nama_bersih}'", ip)
        conn.commit()
        cur.close()

    return {
        "success": True,
        "message": "Profil berhasil diperbarui",
        "user": {
            "username":          user["username"],
            "nama":              user["nama"],
            "divisi":            divisi,
            "level":             level,
            "can_export":        bool(user.get("can_export", True)),
            "can_manage_users":  bool(user.get("can_manage_users", False)),
            "accessible_divisi": accessible,
            "divisi_color":      DIVISI_COLOR.get(divisi, "#374151"),
            "foto_profil":       user.get("foto_profil"),
        }
    }

@router.put("/update-foto")
def update_foto(req: UpdateFotoRequest, request: Request, current_user: dict = Depends(get_current_user)):
    username = current_user["sub"]
    ip = request.client.host if request.client else "unknown"

    # Validasi ukuran foto (maksimal ~200KB setelah Base64 encoding)
    MAX_FOTO_LEN = 270_000  # ~200KB dalam karakter Base64
    if not req.foto or len(req.foto) > MAX_FOTO_LEN:
        raise HTTPException(
            status_code=400,
            detail=f"Ukuran foto terlalu besar (maks ~200KB). Kompres gambar terlebih dahulu."
        )

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE users SET foto_profil=%s WHERE username=%s", (req.foto, username))
        if cur.rowcount == 0:
            cur.close()
            raise HTTPException(status_code=404, detail="User tidak ditemukan")
        
        cur.execute("SELECT * FROM users WHERE username=%s", (username,))
        user = cur.fetchone()
        divisi = user.get("divisi") or "balai_gakkum"
        level  = user.get("level") or DIVISI_LEVEL.get(divisi, 3)
        accessible = get_accessible_divisi(conn, divisi)
        
        log_user_activity(conn, username, "Update Foto Profil", "User mengubah foto profil", ip)
        conn.commit()
        cur.close()

    return {
        "success": True,
        "message": "Foto profil berhasil diperbarui",
        "user": {
            "username":          user["username"],
            "nama":              user["nama"],
            "divisi":            divisi,
            "level":             level,
            "can_export":        bool(user.get("can_export", True)),
            "can_manage_users":  bool(user.get("can_manage_users", False)),
            "accessible_divisi": accessible,
            "divisi_color":      DIVISI_COLOR.get(divisi, "#374151"),
            "foto_profil":       user.get("foto_profil"),
        }
    }
